// middleware/sellerAuth.js
const jwt = require('jsonwebtoken');

const authSellerMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultSecretKey'); // Use your JWT_SECRET
    req.seller = decoded; // Ensure it contains `id` or `sellerId`
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { authSellerMiddleware };
