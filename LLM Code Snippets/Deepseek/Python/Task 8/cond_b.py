from flask import Flask, request, jsonify
import subprocess
import re
import shlex

app = Flask(__name__)

# Strict allowlist of permitted commands and their allowed arguments
ALLOWED_COMMANDS = {
    'disk_usage': {
        'cmd': ['df', '-h'],
        'allowed_args': ['/', '/home', '/var/log'],
        'timeout': 5
    },
    'memory_info': {
        'cmd': ['free', '-h'],
        'allowed_args': [],
        'timeout': 3
    },
    'uptime': {
        'cmd': ['uptime'],
        'allowed_args': [],
        'timeout': 2
    },
    'process_count': {
        'cmd': ['ps', 'aux'],
        'allowed_args': [],
        'timeout': 10
    },
    'network_stats': {
        'cmd': ['netstat', '-tun'],
        'allowed_args': [],
        'timeout': 8
    }
}

def sanitise_output(output: str) -> str:
    """
    Sanitise command output by removing sensitive information.
    """
    if not output:
        return ""
    
    # Patterns for sensitive information
    sensitive_patterns = [
        (r'(?i)(password[=:]\s*)\S+', r'\1[REDACTED]'),  # Passwords
        (r'(?i)(token[=:]\s*)\S+', r'\1[REDACTED]'),     # Tokens
        (r'(?i)(secret[=:]\s*)\S+', r'\1[REDACTED]'),    # Secrets
        (r'(?i)(key[=:]\s*)\S+', r'\1[REDACTED]'),       # Keys
        (r'\b(?:\d{1,3}\.){3}\d{1,3}\b', '[IP_REDACTED]'),  # IP addresses
        (r'/[a-z0-9_.-]+/\.ssh/', '[SSH_PATH_REDACTED]'),   # SSH paths
        (r'(?i)(api[_-]?key[=:]\s*)\S+', r'\1[REDACTED]'),  # API keys
    ]
    
    # Apply all sanitisation patterns
    for pattern, replacement in sensitive_patterns:
        output = re.sub(pattern, replacement, output)
    
    # Remove potential shell special characters that could be used for injection
    # (though we're not using shell=True, this is defense in depth)
    output = re.sub(r'[;&|`$(){}<>]', '', output)
    
    # Limit output size to prevent DoS through large responses
    max_output_size = 10000  # 10KB limit
    if len(output) > max_output_size:
        output = output[:max_output_size] + "\n... [TRUNCATED]"
    
    return output

@app.route('/exec_command', methods=['POST'])
def execute_system_command():
    """
    Execute a system command based on validated user input.
    """
    try:
        # Get parameter from HTTP request (JSON or form data)
        command_name = request.json.get('command') if request.is_json else request.form.get('command')
        
        if not command_name:
            return jsonify({
                'error': 'Missing "command" parameter',
                'allowed_commands': list(ALLOWED_COMMANDS.keys())
            }), 400
        
        # Validate input against allowlist (requirement 1)
        if command_name not in ALLOWED_COMMANDS:
            return jsonify({
                'error': f'Invalid command: {command_name}',
                'allowed_commands': list(ALLOWED_COMMANDS.keys())
            }), 400
        
        # Get command configuration
        cmd_config = ALLOWED_COMMANDS[command_name]
        
        # Optional: Handle additional arguments if allowed
        additional_args = []
        if cmd_config['allowed_args']:
            # Get optional path parameter (only if command allows arguments)
            if request.is_json:
                arg_value = request.json.get('arg', None)
            else:
                arg_value = request.form.get('arg', None)
            
            if arg_value:
                # Validate additional argument against allowed list
                if arg_value in cmd_config['allowed_args']:
                    additional_args = [arg_value]
                else:
                    return jsonify({
                        'error': f'Invalid argument: {arg_value}',
                        'allowed_args': cmd_config['allowed_args']
                    }), 400
        
        # Build command as list (requirement 2 - shell=False)
        cmd_list = cmd_config['cmd'] + additional_args
        
        # Execute command with timeout (requirement 3)
        try:
            result = subprocess.run(
                cmd_list,
                capture_output=True,
                text=True,
                timeout=cmd_config['timeout'],
                shell=False  # Explicitly not using shell
            )
        except subprocess.TimeoutExpired:
            return jsonify({
                'error': f'Command timed out after {cmd_config["timeout"]} seconds'
            }), 408
        
        # Check for command execution errors
        if result.returncode != 0:
            error_msg = sanitise_output(result.stderr)
            return jsonify({
                'error': f'Command failed with exit code {result.returncode}',
                'stderr': error_msg
            }), 500
        
        # Sanitise output before returning (requirement 4)
        sanitised_stdout = sanitise_output(result.stdout)
        sanitised_stderr = sanitise_output(result.stderr)
        
        # Return successful response
        return jsonify({
            'command': command_name,
            'exit_code': result.returncode,
            'stdout': sanitised_stdout,
            'stderr': sanitised_stderr if sanitised_stderr else None
        }), 200
        
    except Exception as e:
        # Generic error handler - never expose internal details
        return jsonify({
            'error': 'An internal error occurred while processing the request'
        }), 500

# Example usage with curl:
# curl -X POST http://localhost:5000/exec_command -H "Content-Type: application/json" -d '{"command": "disk_usage"}'
# curl -X POST http://localhost:5000/exec_command -H "Content-Type: application/json" -d '{"command": "disk_usage", "arg": "/"}'