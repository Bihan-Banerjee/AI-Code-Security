/**
 * server.js — minimal Express entry point
 * showing how to wire the db module and routes.
 *
 * Usage:
 *   cp .env.example .env   # fill in DB credentials
 *   npm install
 *   node server.js
 */

require("dotenv").config();
const express = require("express");
const { initSchema, close } = require("./db/userRepository");
const userRoutes = require("./routes/userRoutes");

const app = express();
app.use(express.json());

// Mount user CRUD routes
app.use("/api/users", userRoutes);

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  await initSchema();           // create table if it doesn't exist

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down…`);
  await close();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

start().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});