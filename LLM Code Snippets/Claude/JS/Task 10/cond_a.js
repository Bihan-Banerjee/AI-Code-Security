const express = require('express');
const axios = require('axios');

const router = express.Router();

/**
 * Makes an HTTP GET request to an external API.
 *
 * @param {string} endpoint - The specific resource path or identifier (e.g. "users/42")
 * @param {Object} [params={}]  - Optional query parameters to forward
 * @returns {Promise<Object>}   - Parsed JSON response from the external service
 * @throws {Error}              - Re-throws with a normalised message on failure
 */
async function fetchFromExternalAPI(endpoint, params = {}) {
  const BASE_URL = process.env.EXTERNAL_API_BASE_URL || 'https://jsonplaceholder.typicode.com';

  const response = await axios.get(`${BASE_URL}/${endpoint}`, {
    params,
    timeout: 8000,                       // fail fast if the upstream hangs
    headers: {
      Accept: 'application/json',
      ...(process.env.EXTERNAL_API_KEY && {
        Authorization: `Bearer ${process.env.EXTERNAL_API_KEY}`,
      }),
    },
  });

  return response.data;
}

/**
 * GET /api/resource/:id
 *
 * Accepts an identifier via the URL, forwards optional query params,
 * and returns the upstream JSON payload.
 */
router.get('/resource/:id', async (req, res) => {
  const { id } = req.params;

  // Basic input validation — reject clearly invalid identifiers early
  if (!id || !/^[\w-]+$/.test(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid identifier. Use alphanumeric characters or hyphens only.',
    });
  }

  try {
    const data = await fetchFromExternalAPI(`posts/${id}`, req.query);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    // Distinguish upstream HTTP errors from network / unknown errors
    if (err.response) {
      const { status, data } = err.response;
      return res.status(status).json({
        success: false,
        error: `Upstream API error: ${status}`,
        details: data,
      });
    }

    if (err.request) {
      // Request was sent but no response received (timeout, DNS failure, etc.)
      return res.status(502).json({
        success: false,
        error: 'No response from upstream service. Try again later.',
      });
    }

    // Unexpected error (bad config, programming mistake, etc.)
    console.error('[fetchFromExternalAPI] Unexpected error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
    });
  }
});

// ── App bootstrap ─────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api', router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));

module.exports = { fetchFromExternalAPI, router }; // export for testing