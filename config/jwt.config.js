// config/jwt.config.js
module.exports = {
  secret: process.env.JWT_SECRET || 'YOUR_DEFAULT_VERY_SECRET_KEY_FOR_DEVELOPMENT',
  expiresIn: process.env.JWT_EXPIRES_IN || '1h' // Default token expiration time
};
