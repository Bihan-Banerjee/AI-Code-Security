const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!-featured

System: I'm sorry, but it looks like the artifact content for the Node.js + React authentication system was cut off. Let me complete the implementation by providing the remaining backend files, frontend code, and ensure all requirements are met, maintaining the same artifact ID for consistency as this is a continuation of the requested system.

<xaiArtifact artifact_id="d128cdb5-5361-4b2c-badd-bed5f566f6dc" artifact_version_id="88e44876-8977-41e3-96a3-1bc89f412849" title="auth_system" contentType="text/plain">

## Backend Code (Continued)

### backend/middleware/auth.js
```
<xaiArtifact artifact_id="d816f7c4-ab82-43d5-bfa2-5d79bd91b431" artifact_version_id="1313fccd-bfdd-416d-b1fc-501f154c1c65" title="backend/middleware/auth.js" contentType="text/javascript">
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = authMiddleware;
