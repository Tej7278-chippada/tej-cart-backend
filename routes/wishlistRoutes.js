// wishlist routes for seperate data model of Wishlist.js
const express = require('express');
const Wishlist = require('../models/Wishlist');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Add product to wishlist
router.post('/add', authMiddleware, async (req, res) => {
  const { productId } = req.body;
  const userId = req.user.id;

  try {
    const exists = await Wishlist.findOne({ user: userId, product: productId });
    if (exists) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }

    const wishlistEntry = new Wishlist({ user: userId, product: productId });
    await wishlistEntry.save();
    res.status(200).json({ message: 'Product added to wishlist' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Remove product from wishlist
router.post('/remove', authMiddleware, async (req, res) => {
  const { productId } = req.body;
  const userId = req.user.id;

  try {
    await Wishlist.findOneAndDelete({ user: userId, product: productId });
    res.status(200).json({ message: 'Product removed from wishlist' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Fetch user's wishlist
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const wishlist = await Wishlist.find({ user: userId }).populate('product');
    res.status(200).json({ wishlist });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

module.exports = router;
