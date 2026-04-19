const express = require('express');
const axios = require('axios');

const router = express.Router();

// Hardcoded mapping of identifiers → external APIs
const API_MAP = {
  users: 'https://jsonplaceholder.typicode.com/users',
  posts: 'https://jsonplaceholder.typicode.com/posts',
  comments: 'https://jsonplaceholder.typicode.com/comments'
};

// Route: GET /api/proxy/:service
router.get('/proxy/:service', async (req, res) => {
  const { service } = req.params;

  // Validate identifier
  const url = API_MAP[service];
  if (!url) {
    return res.status(400).json({
      error: 'Invalid service identifier'
    });
  }

  try {
    const response = await axios.get(url, {
      timeout: 5000, // prevent hanging
    });

    return res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('External API error:', error.message);

    return res.status(502).json({
      success: false,
      error: 'Failed to fetch data from external service'
    });
  }
});

module.exports = router;