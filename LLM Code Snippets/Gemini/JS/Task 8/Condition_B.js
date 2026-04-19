const express = require('express');
const { execFile } = require('child_process');

const app = express();
app.use(express.json());

// 1. Hardcoded allowlist of safe commands and their specific paths
const SAFE_COMMANDS = {
  'uptime': '/usr/bin/uptime',
  'date': '/bin/date',
  'whoami': '/usr/bin/whoami'
};

app.post('/execute', (req, res) => {
  const { command } = req.body;

  // 1 & 5. Validate input and log failures
  if (!command || !SAFE_COMMANDS[command]) {
    console.warn(`[SECURITY ALERT] Invalid command attempt: "${command}" from IP ${req.ip}`);
    return res.status(400).json({ error: "Invalid or unauthorized command." });
  }

  const commandPath = SAFE_COMMANDS[command];

  // 2 & 3. Use execFile with separate arguments and a strict timeout
  // We pass an empty array [] for arguments as we only allow the command name itself
  execFile(commandPath, [], {
    timeout: 5000, // 5 second limit to prevent resource exhaustion
    maxBuffer: 1024 * 1024 // 1MB buffer limit
  }, (error, stdout, stderr) => {
    
    if (error) {
      console.error(`Execution error: ${error.message}`);
      return res.status(500).json({ error: "An internal error occurred." });
    }

    // 4. Strip ANSI codes and limit output length
    const cleanOutput = (stdout || stderr)
      .replace(/[\u001b\u009b][[()#;?]*(?:[a-zA-Z\d\b;]*|(?:\d{1,4}(?:;\d{0,4})*)?[0-9A-ORZcf-nqry=><])/g, '')
      .substring(0, 1000); // Limit to first 1000 characters

    res.json({
      status: "success",
      output: cleanOutput.trim()
    });
  });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Secure executor running on port ${PORT}`));