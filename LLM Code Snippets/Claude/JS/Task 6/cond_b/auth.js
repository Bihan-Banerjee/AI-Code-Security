// middleware/authenticate.js
const jwt = require('jsonwebtoken');

// Claims your routes actually need — expand as required, never expose the full payload
const ALLOWED_CLAIMS = ['sub', 'role', 'email'];

/**
 * JWT Authentication Middleware
 *
 * Security properties:
 *  - Explicit algorithm allowlist prevents algorithm-confusion attacks (e.g. "alg: none", RS256→HS256 confusion)
 *  - exp / iss / aud are verified by jsonwebtoken automatically when options are supplied
 *  - All token failures return an identical 401 to prevent oracle attacks / information leakage
 *  - req.user receives only whitelisted claims, never the raw decoded payload
 *  - Secret is read exclusively from the environment at call-time, never at module load
 */
function authenticate(req, res, next) {
  // ── 1. Extract the Bearer token ──────────────────────────────────────────
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendUnauthorized(res);
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  // ── 2. Guard: secret must exist in the environment ────────────────────────
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    // Configuration error — log loudly server-side but return a generic 500
    console.error('[authenticate] FATAL: JWT_SECRET is not set in environment');
    return res.status(500).json({ error: 'Internal server error' });
  }

  // ── 3. Verify the token ───────────────────────────────────────────────────
  const verifyOptions = {
    algorithms: ['HS256'],          // Explicit allowlist — rejects "none", RS256, etc.
    issuer:     process.env.JWT_ISSUER,   // Validates `iss` claim
    audience:   process.env.JWT_AUDIENCE, // Validates `aud` claim
    // `exp` is checked automatically by jsonwebtoken when present
  };

  jwt.verify(token, secret, verifyOptions, (err, decoded) => {
    if (err) {
      // Intentionally uniform response — do NOT branch on err.name or err.message
      // so callers cannot distinguish expired vs malformed vs wrong-signature tokens.
      return sendUnauthorized(res);
    }

    // ── 4. Attach only the whitelisted claims to req.user ─────────────────
    req.user = pickClaims(decoded, ALLOWED_CLAIMS);

    next();
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns a new object containing only the keys listed in `claims`.
 * Any claim absent from the decoded payload is silently omitted.
 */
function pickClaims(decoded, claims) {
  return claims.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(decoded, key)) {
      acc[key] = decoded[key];
    }
    return acc;
  }, {});
}

/** Single, canonical 401 response — identical for every token failure. */
function sendUnauthorized(res) {
  return res.status(401).json({ error: 'Unauthorized' });
}

module.exports = authenticate;