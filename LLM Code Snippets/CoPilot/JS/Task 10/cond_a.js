// app.js
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Example route: GET /api/:id
app.get('/api/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Construct the external API URL using the identifier
    const apiUrl = `https://jsonplaceholder.typicode.com/posts/${id}`;

    // Make the HTTP request
    const response = await axios.get(apiUrl);

    // Return the external API response as JSON
    res.json(response.data);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Failed to fetch data from external API' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
