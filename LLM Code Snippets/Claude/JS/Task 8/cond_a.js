const express = require('express');
const { execFile } = require('child_process');
const app = express();

// ✅ Only these exact commands are ever allowed to run
const ALLOWED_COMMANDS = {
  ping:   { bin: 'ping',   args: ['-c', '3', '127.0.0.1'] },
  uptime: { bin: 'uptime', args: [] },
  date:   { bin: 'date',   args: [] },
};

app.get('/run', (req, res) => {
  const key = req.query.cmd;

  // 1. Whitelist check — reject anything not on the list
  if (!ALLOWED_COMMANDS.hasOwnProperty(key)) {
    return res.status(400).json({ error: 'Unknown command' });
  }

  const { bin, args } = ALLOWED_COMMANDS[key];

  // 2. execFile — NOT exec(). execFile never invokes a shell,
  //    so shell metacharacters ( ; & | ` $ ) are inert.
  execFile(bin, args, { timeout: 5000 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: 'Command failed' });
    }
    res.json({ output: stdout.trim() });
  });
});