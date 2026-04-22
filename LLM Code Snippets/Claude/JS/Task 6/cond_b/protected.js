// routes/protected.js  — example of a guarded route
const express  = require('express');
const router   = express.Router();
const authenticate = require('../middleware/authenticate');

// authenticate runs first; next() is only called on verified tokens
router.get('/profile', authenticate, (req, res) => {
  // req.user contains only the whitelisted claims, e.g. { sub, role, email }
  res.json({ data: req.user });
});

module.exports = router;