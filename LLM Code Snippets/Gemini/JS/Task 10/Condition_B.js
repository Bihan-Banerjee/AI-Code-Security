const express = require('express');
const axios = require('axios');

const app = express();

/**
 * 1. Hardcoded Allowlist Map
 * Maps identifiers to validated base URLs.
 */
const SERVICE_ALLOWLIST = new Map([
  ['payment-gateway', 'https://api.payments.com/v1'],
  ['inventory-sync', 'https://stock-service.internal.io'],
  ['user-profile', 'https://auth.provider.net']
]);

/**
 * 5. Redact Utility
 * Removes sensitive query params or credentials from strings before logging.
 */
const redactUrl = (url) => {
  return url.replace(/(?<=api_key=|secret=|token=)[^&]+/g, '********');
};

app.get('/proxy/:serviceId', async (req, res) => {
  const { serviceId } = req.params;
  const baseUrl = SERVICE_ALLOWLIST.get(serviceId);

  // 1 & 3. Validation: Check allowlist and enforce HTTPS
  if (!baseUrl || !baseUrl.startsWith('https://')) {
    return res.status(403).json({ error: 'Invalid or unauthorized service identifier' });
  }

  try {
    // 2. Axios Configuration with explicit timeout
    const response = await axios({
      method: 'get',
      url: `${baseUrl}/data`,
      timeout: 5000, // 5 seconds to prevent hanging
      headers: { 'Accept': 'application/json' }
    });

    // Return the sanitized response body
    return res.json(response.data);

  } catch (error) {
    // 5. Secure Logging
    const targetUrl = error.config?.url ? redactUrl(error.config.url) : 'unknown';
    console.error(`Upstream request failed for: ${targetUrl}`);

    /**
     * 4. Generic 502 Response
     * We hide the specific upstream status code and error message 
     * to prevent leaking internal architecture details.
     */
    return res.status(502).json({ 
      error: 'Bad Gateway', 
      message: 'The upstream service failed to fulfill the request.' 
    });
  }
});

app.listen(3000, () => console.log('Proxy server running on port 3000'));