const axios = require('axios');

// Hardcoded allowlist Map of permitted service identifiers to base URLs
const ALLOWED_SERVICES = new Map([
    ['users-api', 'https://api.example.com/users'],
    ['products-api', 'https://api.example.com/products'],
    ['payments-api', 'https://api.secure-payments.com/v1'],
    ['analytics-api', 'https://analytics.internal.example.com/data']
]);

// Utility function to redact sensitive information from URLs before logging
function redactUrl(url) {
    // Redact common credential patterns in URLs
    return url.replace(/([?&;](api[_-]?key|token|auth|password|secret)=)[^&;]+/gi, '$1[REDACTED]');
}

// Utility function to create a safe error response (generic 502)
function createErrorResponse() {
    return {
        status: 502,
        json: {
            error: 'Bad Gateway',
            message: 'The upstream service returned an invalid response or is unavailable'
        }
    };
}

/**
 * Makes an HTTP request to an external API using Express.js conventions
 * @param {string} serviceIdentifier - The identifier for the target service
 * @param {Object} options - Request options (method, path, data, headers)
 * @returns {Promise<Object>} - The response data
 */
async function proxyApiRequest(serviceIdentifier, options = {}) {
    const {
        method = 'GET',
        path = '',
        data = null,
        headers = {}
    } = options;

    // Validate service identifier exists in allowlist
    if (!ALLOWED_SERVICES.has(serviceIdentifier)) {
        console.error(`[SECURITY] Rejected request for unknown service: ${serviceIdentifier}`);
        throw createErrorResponse();
    }

    const baseUrl = ALLOWED_SERVICES.get(serviceIdentifier);
    
    // Enforce HTTPS only - reject any non-HTTPS URLs
    if (!baseUrl.startsWith('https://')) {
        console.error(`[SECURITY] Rejected non-HTTPS URL for service ${serviceIdentifier}: ${redactUrl(baseUrl)}`);
        throw createErrorResponse();
    }

    // Construct the full URL
    const fullUrl = `${baseUrl}${path}`;
    
    // Log the request (with redacted URL to hide any credentials)
    console.log(`[INFO] Proxying ${method} request to ${serviceIdentifier}: ${redactUrl(fullUrl)}`);

    try {
        // Configure axios with timeout and other security settings
        const response = await axios({
            method,
            url: fullUrl,
            data,
            headers: {
                'User-Agent': 'Express-Secure-Proxy/1.0',
                ...headers
            },
            timeout: 5000, // 5 second timeout to prevent indefinite hanging
            maxRedirects: 0, // Disable redirects to prevent SSRF via redirects
            validateStatus: (status) => status < 400 // Only resolve for success status codes
        });

        // Return the sanitised response body
        return {
            status: response.status,
            data: response.data,
            headers: response.headers
        };

    } catch (error) {
        // Log minimal error info without exposing upstream details
        console.error(`[ERROR] Proxy request failed for ${serviceIdentifier}: ${error.code || error.message}`);
        
        // Return generic 502 response without forwarding upstream error details
        throw createErrorResponse();
    }
}

// Express route handler example using the function
async function externalApiProxyHandler(req, res) {
    const serviceIdentifier = req.params.serviceId; // Or from query params
    const { method = 'GET', path = '', data, headers } = req.body || {};

    try {
        const result = await proxyApiRequest(serviceIdentifier, {
            method: req.method || method,
            path: req.params[0] || path, // Capture wildcard path
            data: req.body || data,
            headers: req.headers
        });

        // Send successful response
        res.status(result.status).json(result.data);
        
    } catch (error) {
        // The error is already our generic 502 response
        if (error.status === 502) {
            res.status(502).json(error.json);
        } else {
            // Fallback for unexpected errors
            console.error('[ERROR] Unexpected error in proxy handler');
            res.status(502).json({
                error: 'Bad Gateway',
                message: 'An unexpected error occurred while communicating with the upstream service'
            });
        }
    }
}

// Example usage in an Express app:
/*
const express = require('express');
const app = express();

app.use(express.json());

// Route with path capture for flexible proxying
app.all('/api/proxy/:serviceId/*', async (req, res) => {
    await externalApiProxyHandler(req, res);
});

app.listen(3000, () => {
    console.log('Secure proxy server running on port 3000');
});
*/

module.exports = { proxyApiRequest, externalApiProxyHandler };