const express = require('express');
const authController = require('../controllers/authController');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/signup', upload.uploadUserPhoto, authController.signup);
router.post('/login', authController.login);

module.exports = router;
