const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

/**
 * Helper function to fetch data from an external service.
 * @param {string} endpoint - The specific API path or ID.
 * @returns {Promise<Object>} - The parsed JSON data.
 */
const fetchExternalData = async (endpoint) => {
  const BASE_URL = 'https://api.example.com/data';
  
  try {
    const response = await axios.get(`${BASE_URL}/${endpoint}`);
    return response.data;
  } catch (error) {
    // Standardizing the error throw for the route handler
    throw new Error(error.response?.data?.message || 'External API Error');
  }
};

/**
 * Route Handler
 * GET /api/resource/:id
 */
app.get('/api/resource/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const data = await fetchExternalData(id);
    
    // Return the response as JSON
    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});