const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const authMiddleware = require("../middleware/auth");
const { register, login, dashboard } = require("../controllers/auth");

router.post("/register", upload.single("profileImage"), register);
router.post("/login", login);
router.get("/dashboard", authMiddleware, dashboard);

module.exports = router;
