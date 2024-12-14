// Code to add the WishList of users stored on WishList data model seperately.
// routes/wishlist.js
// const express = require('express');
// const Wishlist = require('../models/wishlistModel');
// const { authMiddleware } = require('../middleware/auth');
// const router = express.Router();

// // Fetch wishlist for the logged-in user
// router.get('/', authMiddleware, async (req, res) => {
//     try {
//         const userId = req.user.id; // Corrected userId
//         const wishlist = await Wishlist.find({ userId }).populate('products');
//         res.status(200).json(wishlist);
//     } catch (error) {
//         console.error('Error fetching wishlist:', error);
//         res.status(500).json({ message: 'Failed to fetch wishlist.' });
//     }
// });

// // Add a product to the user's wishlist
// router.post('/add', authMiddleware, async (req, res) => {
//     try {
//         const { productId } = req.body;
//         const userId = req.user.id; // Corrected userId

//         // Check if wishlist exists for the user
//         let wishlist = await Wishlist.findOne({ userId });
//         if (!wishlist) {
//             // Create a new wishlist for the user if it doesn't exist
//             wishlist = new Wishlist({ userId, products: [productId] });
//         } else {
//             // Check if the product is already in the wishlist
//             if (wishlist.products.includes(productId)) {
//                 return res.status(400).json({ message: 'Product already in wishlist.' });
//             }
//             wishlist.products.push(productId); // Add the product to the wishlist
//         }

//         await wishlist.save();
//         res.status(201).json({ message: 'Product added to wishlist.' });
//     } catch (error) {
//         console.error('Error adding to wishlist:', error);
//         res.status(500).json({ message: 'Failed to add to wishlist.' });
//     }
// });

// // Remove a product from the user's wishlist
// router.post('/remove', authMiddleware, async (req, res) => {
//     try {
//         const { productId } = req.body;
//         const userId = req.user.id; // Corrected userId

//         const wishlist = await Wishlist.findOne({ userId });
//         if (wishlist) {
//             wishlist.products = wishlist.products.filter(
//                 (id) => id.toString() !== productId
//             );
//             await wishlist.save();
//         }
//         res.status(200).json({ message: 'Product removed from wishlist.' });
//     } catch (error) {
//         console.error('Error removing from wishlist:', error);
//         res.status(500).json({ message: 'Failed to remove from wishlist.' });
//     }
// });

// module.exports = router;

// Code to bind the WishList to the user's database.

const express = require('express');
const User = require('../models/userModel');
const { authMiddleware } = require('../middleware/auth');
// const { authMiddleware } = require('../middleware/auth');
// const User = require('../models/userModel');
const Product = require('../models/Product');
const router = express.Router();

// Add product to wishlist
router.post('/add', authMiddleware, async (req, res) => {
    const { productId } = req.body;
    const userId = req.user.id; // Extract from JWT token
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        if (!user.wishlist.includes(productId)) {
            user.wishlist.push(productId);
            await user.save();
            return res.status(200).json({ message: 'Product added to wishlist', wishlist: user.wishlist });
        }
        res.status(400).json({ message: 'Product already in wishlist' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Remove product from wishlist
router.post('/remove', authMiddleware, async (req, res) => {
    const { productId } = req.body;
    const userId = req.user.id; // Extract from JWT token
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
        await user.save();
        res.status(200).json({ message: 'Product removed from wishlist', wishlist: user.wishlist });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Fetch user's wishlist
router.get('/', authMiddleware, async (req, res) => {
    const userId = req.user.id; // Extract from JWT token
    try {
        const user = await User.findById(userId).populate('wishlist');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json({ wishlist: user.wishlist });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

module.exports = router;
