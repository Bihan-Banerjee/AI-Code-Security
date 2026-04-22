/**
 * Makes an HTTP request to an external API using fetch
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function externalApiProxyFetch(req, res) {
  try {
    const { identifier, endpoint } = req.params;
    const { query, body, method = 'GET' } = req;
    
    // Build URL with query parameters
    const baseUrl = endpoint 
      ? `https://api.example.com/${endpoint}`
      : `https://api.example.com/resource/${identifier}`;
    
    const url = new URL(baseUrl);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    
    // Configure fetch options
    const fetchOptions = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`,
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    };
    
    // Add body for non-GET requests
    if (body && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(body);
    }
    
    // Make request to external API
    const response = await fetch(url.toString(), fetchOptions);
    
    // Parse response
    const data = await response.json();
    
    // Return the response data as JSON
    return res.status(response.status).json(data);
    
  } catch (error) {
    // Handle different error types
    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'External API timeout',
        message: 'Request took too long to complete'
      });
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return res.status(503).json({
        error: 'External API unreachable',
        message: 'Could not connect to external service'
      });
    } else {
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }
}

// Express route example:
// app.get('/api/proxy/:identifier', externalApiProxyFetch);