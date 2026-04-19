/**
 * app.js — Minimal Express app wiring in the auth module
 */

const express = require("express");
const { router: authRouter, sessionMiddleware } = require("./auth/login");

const app = express();

// Parse JSON request bodies
app.use(express.json());

// Session middleware (must come before routes)
app.use(sessionMiddleware);

// Mount auth routes under /auth
//   POST /auth/login
//   POST /auth/logout
app.use("/auth", authRouter);

// Example protected route
const { requireAuth, requireRole } = require("./auth/login");

app.get("/dashboard", requireAuth, (req, res) => {
  res.json({ success: true, message: `Welcome, ${req.session.user.username}!` });
});

app.delete("/admin/user/:id", requireAuth, requireRole("admin"), (req, res) => {
  res.json({ success: true, message: `User ${req.params.id} deleted.` });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));