const express = require("express");
const axios = require("axios");

const router = express.Router();

/**
 * Hardcoded allowlist mapping service identifiers -> base URLs
 * Only HTTPS endpoints are permitted
 */
const SERVICE_ALLOWLIST = new Map([
  ["jsonplaceholder", "https://jsonplaceholder.typicode.com"],
  ["github", "https://api.github.com"],
  ["weather", "https://api.open-meteo.com"]
]);

/**
 * Utility to redact sensitive query params (e.g., api_key, token)
 */
function redactUrl(url) {
  try {
    const parsed = new URL(url);
    const sensitiveParams = ["api_key", "token", "access_token"];

    sensitiveParams.forEach((param) => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, "REDACTED");
      }
    });

    return parsed.toString();
  } catch {
    return "INVALID_URL";
  }
}

/**
 * Express route handler
 * Example: GET /api/fetch/:serviceId?path=/posts
 */
router.get("/fetch/:serviceId", async (req, res) => {
  const { serviceId } = req.params;
  const path = req.query.path || "/";

  // Validate service identifier against allowlist
  if (!SERVICE_ALLOWLIST.has(serviceId)) {
    return res.status(400).json({ error: "Invalid service identifier" });
  }

  const baseUrl = SERVICE_ALLOWLIST.get(serviceId);

  // Enforce HTTPS only
  if (!baseUrl.startsWith("https://")) {
    return res.status(500).json({ error: "Misconfigured service URL" });
  }

  // Construct final URL safely
  let targetUrl;
  try {
    const url = new URL(path, baseUrl);
    targetUrl = url.toString();
  } catch {
    return res.status(400).json({ error: "Invalid path" });
  }

  try {
    // Make external API request with timeout
    const response = await axios.get(targetUrl, {
      timeout: 5000,
      validateStatus: () => true // avoid throwing for non-2xx
    });

    // Log safely (redacted)
    console.log(`Request to: ${redactUrl(targetUrl)}`);

    // Return sanitized response body only
    return res.json(response.data);

  } catch (error) {
    // Log minimal info without leaking sensitive data
    console.error(`Upstream request failed: ${redactUrl(targetUrl)}`);

    // Generic error response (no upstream leakage)
    return res.status(502).json({
      error: "Bad Gateway"
    });
  }
});

module.exports = router;