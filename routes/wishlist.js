// routes/wishlist.js
const express = require('express');
const User = require('../models/userModel');
const Product = require('../models/Product');
const router = express.Router();


// Add product to wishlist
router.post('/add', async (req, res) => {
    const { userId, productId } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.wishlist.includes(productId)) {
            user.wishlist.push(productId);
            await user.save();
            return res.status(200).json({ message: 'Product added to wishlist' });
        }

        res.status(400).json({ message: 'Product already in wishlist' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Remove product from wishlist
router.post('/remove', async (req, res) => {
    const { userId, productId } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
        await user.save();
        res.status(200).json({ message: 'Product removed from wishlist' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Fetch wishlist
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId).populate('wishlist');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json(user.wishlist);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

module.exports = router;
