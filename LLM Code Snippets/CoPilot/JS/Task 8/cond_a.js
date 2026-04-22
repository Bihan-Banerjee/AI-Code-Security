const express = require('express');
const { exec } = require('child_process');
const app = express();

// Example whitelist of safe commands
const allowedCommands = {
  list: 'ls',
  date: 'date',
  uptime: 'uptime'
};

app.get('/run', (req, res) => {
  const cmdKey = req.query.cmd;

  if (!allowedCommands[cmdKey]) {
    return res.status(400).json({ error: 'Invalid command' });
  }

  exec(allowedCommands[cmdKey], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr });
    }
    res.json({ output: stdout });
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
