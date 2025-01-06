const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
// const authMiddleware = require('../middleware/authMiddleware');
const Likes = require('../models/Likes');
const { authMiddleware } = require('../middleware/auth');

// Toggle like on a product
// Toggle like on a product
router.post('/:id/like', authMiddleware, async (req, res) => {
    try {
      const { id: productId } = req.params;
      const userId = req.user.id;
  
      let likeEntry = await Likes.findOne({ productId });
  
      if (!likeEntry) {
        // If no entry for the product, create a new one
        likeEntry = await Likes.create({ productId, userIds: [userId] });
        await Product.findByIdAndUpdate(productId, { $inc: { likes: 1 } });
      } else {
        const userIndex = likeEntry.userIds.indexOf(userId);
  
        if (userIndex === -1) {
          // If user hasn't liked it yet, add the user ID
          likeEntry.userIds.push(userId);
          await Product.findByIdAndUpdate(productId, { $inc: { likes: 1 } });
        } else {
          // If user has liked it, remove the user ID
          likeEntry.userIds.splice(userIndex, 1);
          await Product.findByIdAndUpdate(productId, { $inc: { likes: -1 } });
        }
  
        await likeEntry.save();
      }
  
      const updatedProduct = await Product.findById(productId);
  
      res.status(200).json({
        message: 'Like toggled successfully',
        likes: updatedProduct.likes,
      });
    } catch (error) {
      console.error('Error toggling likes:', error);
      res.status(500).json({ message: 'Error toggling likes' });
    }
  });

  router.get('/:id/isLiked', authMiddleware, async (req, res) => {
    try {
      const { id: productId } = req.params;
      const userIds = req.user.id;
  
      const existingLike = await Likes.findOne({ userIds, productId });
  
      res.status(200).json({ isLiked: !!existingLike });
    } catch (error) {
      console.error('Error checking like status:', error);
      res.status(500).json({ message: 'Error checking like status' });
    }
  });
  
  
  module.exports = router;