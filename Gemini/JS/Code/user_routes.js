const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');

// @route   GET /api/user/dashboard
// @desc    Get user profile (protected route)
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
    try {
        // req.user.id is set by the auth middleware
        const user = await User.findById(req.user.id).select('-password'); // Exclude password hash

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            profilePic: user.profilePic, // This will be the path, e.g., /uploads/profile_pics/filename.jpg
            bio: user.bio,
            phoneNumber: user.phoneNumber,
            date: user.date
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
