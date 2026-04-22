/**
 * userRoutes.js
 * Express router — wires HTTP endpoints to userRepository functions.
 *
 * Mount in server.js:
 *   const userRoutes = require('./routes/userRoutes');
 *   app.use('/api/users', userRoutes);
 */

const express = require("express");
const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  verifyPassword,
} = require("../db/userRepository");

const router = express.Router();

// ─── GET /api/users ───────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const { users, total } = await getAllUsers({ limit, offset });
    res.json({ data: users, total, limit, offset });
  } catch (err) {
    console.error("[GET /users]", err);
    res.status(500).json({ error: "Failed to retrieve users." });
  }
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ data: user });
  } catch (err) {
    console.error("[GET /users/:id]", err);
    res.status(500).json({ error: "Failed to retrieve user." });
  }
});

// ─── POST /api/users ──────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required." });
  }

  try {
    const user = await createUser({ name, email, password, role });
    res.status(201).json({ data: user });
  } catch (err) {
    if (err.code === "EMAIL_TAKEN") {
      return res.status(409).json({ error: err.message });
    }
    console.error("[POST /users]", err);
    res.status(500).json({ error: "Failed to create user." });
  }
});

// ─── PATCH /api/users/:id ─────────────────────────────────────────────────────
router.patch("/:id", async (req, res) => {
  try {
    const user = await updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ data: user });
  } catch (err) {
    if (err.message === "No valid fields provided for update.") {
      return res.status(400).json({ error: err.message });
    }
    console.error("[PATCH /users/:id]", err);
    res.status(500).json({ error: "Failed to update user." });
  }
});

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteUser(req.params.id);
    if (!deleted) return res.status(404).json({ error: "User not found." });
    res.status(204).send();
  } catch (err) {
    console.error("[DELETE /users/:id]", err);
    res.status(500).json({ error: "Failed to delete user." });
  }
});

// ─── POST /api/users/login ────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required." });
  }

  try {
    const user = await verifyPassword(email, password);
    if (!user) return res.status(401).json({ error: "Invalid credentials." });
    res.json({ data: user });
  } catch (err) {
    console.error("[POST /users/login]", err);
    res.status(500).json({ error: "Login failed." });
  }
});

module.exports = router;