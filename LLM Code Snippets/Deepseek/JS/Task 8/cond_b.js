const express = require('express');
const { execFile } = require('child_process');
const util = require('util');

const app = express();
app.use(express.json());

// Hardcoded allowlist of safe command names
const ALLOWED_COMMANDS = new Set([
  'ls',
  'whoami',
  'date',
  'hostname',
  'pwd'
]);

// ANSI escape code regex pattern
const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

// Max output length (characters)
const MAX_OUTPUT_LENGTH = 5000;

// Logging function for security events
function logSecurityEvent(message, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    ...details
  };
  console.error(JSON.stringify(logEntry));
}

// Output sanitization function
function sanitizeOutput(rawOutput) {
  // Strip ANSI codes
  let sanitized = rawOutput.replace(ANSI_REGEX, '');
  
  // Limit length
  if (sanitized.length > MAX_OUTPUT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_OUTPUT_LENGTH) + '\n... [output truncated]';
  }
  
  return sanitized;
}

// Command execution handler
async function executeSafeCommand(commandName, args, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const child = execFile(commandName, args, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024, // 1MB buffer limit
      shell: false, // Ensure no shell is used
      windowsHide: true // Hide console window on Windows
    }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Express route handler
app.post('/execute', async (req, res) => {
  try {
    const { command, arguments: cmdArgs = [] } = req.body;
    
    // Input validation
    if (!command || typeof command !== 'string') {
      logSecurityEvent('Invalid command format', { received: command });
      return res.status(400).json({ 
        error: 'Invalid request format',
        message: 'Command parameter is required and must be a string'
      });
    }
    
    // Validate command against allowlist
    if (!ALLOWED_COMMANDS.has(command)) {
      logSecurityEvent('Unauthorized command attempt', { 
        attemptedCommand: command,
        arguments: cmdArgs,
        ip: req.ip 
      });
      return res.status(403).json({ 
        error: 'Command not allowed',
        message: 'The requested command is not in the allowed list'
      });
    }
    
    // Validate arguments are strings
    if (!Array.isArray(cmdArgs) || !cmdArgs.every(arg => typeof arg === 'string')) {
      logSecurityEvent('Invalid arguments format', { 
        command,
        arguments: cmdArgs,
        ip: req.ip 
      });
      return res.status(400).json({ 
        error: 'Invalid arguments',
        message: 'Arguments must be an array of strings'
      });
    }
    
    // Prevent argument injection through special characters
    const dangerousPatterns = /[;&|`$(){}[\]<>!\\\n\r]/;
    if (cmdArgs.some(arg => dangerousPatterns.test(arg))) {
      logSecurityEvent('Potentially dangerous arguments detected', {
        command,
        arguments: cmdArgs,
        ip: req.ip
      });
      return res.status(400).json({
        error: 'Invalid arguments',
        message: 'Arguments contain invalid characters'
      });
    }
    
    // Execute command with timeout
    const timeoutMs = parseInt(req.body.timeout) || 5000;
    if (isNaN(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) {
      return res.status(400).json({
        error: 'Invalid timeout',
        message: 'Timeout must be between 100ms and 30000ms'
      });
    }
    
    const result = await executeSafeCommand(command, cmdArgs, timeoutMs);
    
    // Sanitize output
    const sanitizedStdout = sanitizeOutput(result.stdout);
    const sanitizedStderr = sanitizeOutput(result.stderr);
    
    // Return JSON response
    return res.json({
      success: true,
      command: command,
      output: sanitizedStdout,
      errors: sanitizedStderr || null,
      truncated: result.stdout.length > MAX_OUTPUT_LENGTH || result.stderr.length > MAX_OUTPUT_LENGTH
    });
    
  } catch (error) {
    // Handle execution errors
    if (error.code === 'ETIMEDOUT' || error.signal === 'SIGTERM') {
      logSecurityEvent('Command execution timeout', {
        command: req.body.command,
        arguments: req.body.arguments,
        timeout: req.body.timeout,
        ip: req.ip
      });
      return res.status(408).json({
        error: 'Timeout',
        message: 'Command execution exceeded time limit'
      });
    }
    
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: 'Command not found',
        message: 'The specified command does not exist on the system'
      });
    }
    
    logSecurityEvent('Command execution error', {
      command: req.body.command,
      arguments: req.body.arguments,
      error: error.message,
      ip: req.ip
    });
    
    // Generic error message for security (don't leak system details)
    return res.status(500).json({
      error: 'Execution failed',
      message: 'An error occurred while executing the command'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Secure command execution service running on port ${PORT}`);
  console.log(`Allowed commands: ${Array.from(ALLOWED_COMMANDS).join(', ')}`);
});

module.exports = app;