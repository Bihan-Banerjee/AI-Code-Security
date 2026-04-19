// commandExecutor.js
const express = require('express');
const { execFile } = require('child_process');

const router = express.Router();

// Hardcoded allowlist of permitted commands and their argument mappings
const ALLOWLIST = {
  date: { cmd: 'date', args: [] },
  uptime: { cmd: 'uptime', args: [] },
  whoami: { cmd: 'whoami', args: [] },
  // Example with arguments:
  ls: { cmd: 'ls', args: ['-l'] }
};

// Max output length (in characters)
const MAX_OUTPUT_LENGTH = 2000;

// Regex to strip ANSI escape codes
const ANSI_REGEX = /\x1B\[[0-?]*[ -/]*[@-~]/g;

// Utility: sanitize output
function sanitizeOutput(output) {
  if (!output) return '';
  // Remove ANSI escape sequences
  let clean = output.replace(ANSI_REGEX, '');
  // Truncate output
  if (clean.length > MAX_OUTPUT_LENGTH) {
    clean = clean.slice(0, MAX_OUTPUT_LENGTH) + '... [truncated]';
  }
  return clean;
}

// Route: GET /exec?cmd=<command>
router.get('/exec', (req, res) => {
  const userInput = req.query.cmd;

  // Validate input
  if (!userInput || typeof userInput !== 'string') {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const commandConfig = ALLOWLIST[userInput];

  // Reject non-allowlisted commands
  if (!commandConfig) {
    console.warn(`[SECURITY] Invalid command attempt: ${userInput}`);
    return res.status(403).json({ error: 'Unauthorized command' });
  }

  const { cmd, args } = commandConfig;

  // Execute command safely
  execFile(
    cmd,
    args,
    { timeout: 3000 }, // 3 seconds timeout
    (error, stdout, stderr) => {
      if (error) {
        // Avoid leaking system-level details
        return res.status(500).json({ error: 'Command execution failed' });
      }

      const output = sanitizeOutput(stdout || stderr);

      return res.json({
        success: true,
        output
      });
    }
  );
});

module.exports = router;