const express = require("express");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

// ─── JWT Secret ───────────────────────────────────────────────────────────────
// In production, load this from an environment variable, never hardcode it.
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * authenticateToken
 *
 * Extracts a Bearer JWT from the Authorization header, verifies its signature
 * and expiry, then attaches the decoded payload to `req.user` so downstream
 * handlers can read it.  Any problem results in an immediate JSON error
 * response; on success, `next()` is called.
 *
 * Expected header format:
 *   Authorization: Bearer <token>
 */
function authenticateToken(req, res, next) {
  // 1. Pull the header value (case-insensitive by Express).
  const authHeader = req.headers["authorization"];

  // 2. Guard: header must exist and start with "Bearer ".
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Missing or malformed Authorization header. Expected: Bearer <token>",
    });
  }

  // 3. Isolate the raw token string.
  const token = authHeader.split(" ")[1];

  // 4. Verify signature, expiry, and any other registered claims.
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      // Distinguish between an expired token and any other verification failure.
      const isExpired = err.name === "TokenExpiredError";
      return res.status(401).json({
        success: false,
        error: isExpired ? "TokenExpired" : "InvalidToken",
        message: isExpired
          ? "Your session has expired. Please log in again."
          : "Token verification failed. The token may be invalid or tampered with.",
      });
    }

    // 5. Attach decoded payload to the request for use by later handlers.
    req.user = decoded;
    next();
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /auth/login
 *
 * Toy login endpoint — replace the credential check with a real database
 * lookup and a proper password-hashing comparison (e.g. bcrypt) in production.
 */
app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: "BadRequest",
      message: "Both 'username' and 'password' fields are required.",
    });
  }

  // ⚠️  Demo only — never hard-code credentials like this in real code.
  const DEMO_USER = { id: 1, username: "admin", role: "admin" };
  const isValid = username === "admin" && password === "password123";

  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: "InvalidCredentials",
      message: "Incorrect username or password.",
    });
  }

  // Sign a token valid for 1 hour.
  const token = jwt.sign(
    { id: DEMO_USER.id, username: DEMO_USER.username, role: DEMO_USER.role },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  return res.status(200).json({
    success: true,
    message: "Login successful.",
    token,
    expiresIn: "1h",
  });
});

/**
 * GET /api/profile  — protected route
 *
 * Only reachable if `authenticateToken` passes.  `req.user` holds the
 * decoded JWT payload that was attached by the middleware.
 */
app.get("/api/profile", authenticateToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Access granted.",
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
    },
  });
});

/**
 * GET /api/admin  — role-protected route
 *
 * Shows how to layer a second inline guard on top of `authenticateToken`
 * to restrict access by role.
 */
app.get("/api/admin", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden",
      message: "You do not have permission to access this resource.",
    });
  }

  res.status(200).json({
    success: true,
    message: "Welcome to the admin panel.",
    data: { secret: "Top-secret admin data." },
  });
});

// ─── Server ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`\nTest it quickly:\n`);
  console.log(
    `  1. Login:   curl -s -X POST http://localhost:${PORT}/auth/login \\`
  );
  console.log(`              -H "Content-Type: application/json" \\`);
  console.log(`              -d '{"username":"admin","password":"password123"}'`);
  console.log(`\n  2. Access:  curl -s http://localhost:${PORT}/api/profile \\`);
  console.log(`              -H "Authorization: Bearer <token from step 1>"`);
});