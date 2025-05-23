const jwt = require('jsonwebtoken');
const jwtConfig = require('../../config/jwt.config');

/**
 * Middleware to authenticate a JWT token.
 * If the token is valid, it attaches the decoded user payload to `req.user`.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Token is expected to be in the format: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token is required.' });
  }

  jwt.verify(token, jwtConfig.secret, (err, user) => {
    if (err) {
      // Differentiate between token expiration and other verification errors if needed
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ message: 'Access token expired.' });
      }
      console.error('JWT Verification Error:', err.message);
      return res.status(403).json({ message: 'Invalid access token.' }); // Forbidden
    }
    req.user = user; // Attach user payload (e.g., { id, username, email }) to the request
    next();
  });
};

module.exports = {
  authenticateToken
};
