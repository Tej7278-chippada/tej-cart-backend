// middleware/auth.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultSecretKey'); // Use your JWT_SECRET
    req.user = decoded; // Attach decoded user info to the request object
    // Refresh token logic
    const now = Math.floor(Date.now() / 1000);
    const timeToExpire = decoded.exp - now;
    const refreshThreshold = 15 * 60; // Refresh if less than 15 minutes left

    if (timeToExpire < refreshThreshold) {
      const newToken = jwt.sign(
        { id: decoded.id, tokenUsername: decoded.tokenUsername },
        process.env.JWT_SECRET || 'defaultSecretKey',
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      );
      res.setHeader('Authorization', `Bearer ${newToken}`);
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { authMiddleware };
