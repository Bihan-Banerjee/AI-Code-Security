const express = require('express');
const { execFile } = require('child_process');
const router = express.Router();

// ── 1. Allowlist ──────────────────────────────────────────────────────────────
// Map safe "command names" → [binary, [...fixed args]]
// Never let user input reach the binary path or be concatenated into a shell string.
const COMMAND_ALLOWLIST = {
  uptime:   { bin: '/usr/bin/uptime',  args: [] },
  date:     { bin: '/bin/date',        args: [] },
  whoami:   { bin: '/usr/bin/whoami',  args: [] },
  hostname: { bin: '/bin/hostname',    args: [] },
  diskfree: { bin: '/bin/df',          args: ['-h', '--output=source,size,avail,pcent'] },
};

// ── 2. Constants ──────────────────────────────────────────────────────────────
const EXEC_TIMEOUT_MS  = 3_000;   // kill child after 3 s
const MAX_OUTPUT_BYTES = 4_096;   // truncate stdout/stderr
// eslint-disable-next-line no-control-regex
const ANSI_STRIP_RE    = /[\u001B\u009B][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]/g;

// ── 3. Helpers ────────────────────────────────────────────────────────────────
/** Remove ANSI escape codes and truncate to MAX_OUTPUT_BYTES. */
function sanitizeOutput(raw) {
  const stripped = raw.replace(ANSI_STRIP_RE, '');
  return stripped.length > MAX_OUTPUT_BYTES
    ? stripped.slice(0, MAX_OUTPUT_BYTES) + '\n[output truncated]'
    : stripped;
}

/** Promisified execFile with a hard timeout and no shell. */
function runCommand(bin, args) {
  return new Promise((resolve, reject) => {
    execFile(
      bin,
      args,
      {
        shell:   false,        // never invoke /bin/sh
        timeout: EXEC_TIMEOUT_MS,
        killSignal: 'SIGTERM',
        maxBuffer: MAX_OUTPUT_BYTES * 2,
      },
      (err, stdout, stderr) => {
        if (err) return reject(err);
        resolve({ stdout, stderr });
      }
    );
  });
}

// ── 4. Route handler ──────────────────────────────────────────────────────────
/**
 * GET /run-command?cmd=<name>
 *
 * Executes a pre-approved system command identified by the "cmd" query param.
 * Returns JSON: { success, output } | { success, error }
 */
router.get('/run-command', async (req, res) => {
  const requestedCmd = req.query.cmd;

  // ── 4a. Presence check ─────────────────────────────────────────────────────
  if (!requestedCmd) {
    return res.status(400).json({
      success: false,
      error: 'Missing required query parameter: cmd',
    });
  }

  // ── 4b. Allowlist validation + security logging ────────────────────────────
  const entry = COMMAND_ALLOWLIST[requestedCmd];
  if (!entry) {
    // 5. Log invalid attempts for security monitoring (never echo raw input into logs unescaped in prod).
    console.warn('[SECURITY] Rejected disallowed command attempt', {
      requestedCmd: String(requestedCmd).slice(0, 128), // cap log length
      ip:        req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    });

    // Generic message — do NOT reveal allowlist contents to the caller.
    return res.status(400).json({
      success: false,
      error: 'Invalid command.',
    });
  }

  // ── 4c. Execute ────────────────────────────────────────────────────────────
  try {
    const { stdout, stderr } = await runCommand(entry.bin, entry.args);

    const output = sanitizeOutput(stdout || stderr);

    return res.status(200).json({ success: true, output });

  } catch (err) {
    const isTimeout = err.killed || err.signal === 'SIGTERM';

    // Log server-side detail; return only a generic message to the client.
    console.error('[ERROR] Command execution failed', {
      cmd:       requestedCmd,
      isTimeout,
      message:   err.message,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      error: isTimeout ? 'Command timed out.' : 'Command execution failed.',
    });
  }
});

module.exports = router;