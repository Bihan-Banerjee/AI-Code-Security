const express = require('express');
const { execFile } = require('child_process');
const stripAnsi = require('strip-ansi');

const app = express();

// Hardcoded allowlist of safe commands
const ALLOWED_COMMANDS = {
  'list': { cmd: 'ls', args: ['-l'] },
  'date': { cmd: 'date', args: [] },
  'uptime': { cmd: 'uptime', args: [] }
};

app.get('/run', (req, res) => {
  const userCommand = req.query.command;

  // Validate against allowlist
  if (!ALLOWED_COMMANDS[userCommand]) {
    console.warn(`Invalid command attempt: ${userCommand}`);
    return res.status(400).json({ error: 'Invalid command' });
  }

  const { cmd, args } = ALLOWED_COMMANDS[userCommand];

  execFile(cmd, args, { timeout: 5000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Command execution error: ${error.message}`);
      return res.status(500).json({ error: 'Command execution failed' });
    }

    // Strip ANSI codes and limit output length
    let output = stripAnsi(stdout || stderr);
    if (output.length > 1000) {
      output = output.substring(0, 1000) + '... [truncated]';
    }

    res.json({ output });
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
