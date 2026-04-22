from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

ALLOWED_COMMANDS = {
    'ping': 'ping -c 4 8.8.8.8',
    'date': 'date',
    'uptime': 'uptime'
}

@app.route('/run', methods=['GET'])
def run_command():
    cmd_key = request.args.get('command')
    
    if cmd_key not in ALLOWED_COMMANDS:
        return jsonify({'error': 'Command not allowed'}), 400
    
    try:
        result = subprocess.run(
            ALLOWED_COMMANDS[cmd_key],
            shell=True,
            capture_output=True,
            text=True,
            timeout=5
        )
        return jsonify({'output': result.stdout})
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Command timeout'}), 500