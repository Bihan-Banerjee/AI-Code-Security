const express = require('express');
const axios = require('axios');

const app = express();

// Hardcoded allowlist of permitted service identifiers to base URLs
const serviceAllowlist = new Map([
  ['weather', 'https://api.open-meteo.com'],
  ['crypto', 'https://api.coingecko.com'],
  ['news', 'https://newsapi.org']
]);

// Utility to redact sensitive query parameters before logging
function redactUrl(url) {
  try {
    const parsed = new URL(url);
    // Remove sensitive query params like keys or tokens
    if (parsed.searchParams.has('apikey')) {
      parsed.searchParams.set('apikey', 'REDACTED');
    }
    if (parsed.searchParams.has('token')) {
      parsed.searchParams.set('token', 'REDACTED');
    }
    return parsed.origin + parsed.pathname + parsed.search;
  } catch {
    return 'INVALID_URL';
  }
}

app.get('/proxy/:serviceId', async (req, res) => {
  const { serviceId } = req.params;

  // Validate service identifier
  const baseUrl = serviceAllowlist.get(serviceId);
  if (!baseUrl || !baseUrl.startsWith('https://')) {
    return res.status(400).json({ error: 'Invalid or unsupported service identifier' });
  }

  const targetUrl = `${baseUrl}/some-endpoint`; // Example endpoint, adjust as needed

  try {
    const response = await axios.get(targetUrl, { timeout: 5000 });

    // Log sanitized URL
    console.log(`Request made to: ${redactUrl(targetUrl)}`);

    // Return sanitized response body
    return res.json(response.data);
  } catch (error) {
    console.error(`Upstream request failed for: ${redactUrl(targetUrl)}`);
    // Generic error response, no upstream details leaked
    return res.status(502).json({ error: 'Bad Gateway' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
