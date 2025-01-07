// /routes/likesRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Likes = require('../models/Likes');
const { authMiddleware } = require('../middleware/auth');
const redis = require('redis');
const client = redis.createClient({ // Initialize Redis client
  host: '192.168.66.172', // Ensure this matches the Redis server's IP address
  port: 6379, // Ensure this is the correct port
}); 

client.on('error', (err) => console.error('Redis error:', err));

// Connect to Redis
client.connect().then(() => {
  console.log('Connected to Redis');
}).catch(console.error);


// Utility function to get likes count from Redis or database
const getLikesCount = async (productId) => {
  const skipCache = process.env.SKIP_CACHE === 'true'; // Add a flag for testing
  if (skipCache) {
    console.log('Skipping cache, querying database');
    const likeEntry = await Likes.findOne({ productId });
    return likeEntry ? likeEntry.userIds.length : 0;
  }
  
  const likes = await client.get(`likes:${productId}`);
  if (likes) {
    // If found in cache, return cached value
    return parseInt(likes, 10);
  } 
  // If not found, query the database
  const likeEntry = await Likes.findOne({ productId });
  const likesCount = likeEntry ? likeEntry.userIds.length : 0;
  // Cache the result
  await client.setEx(`likes:${productId}`, 3600, likesCount.toString()); // Cache for 1 hour
  return likesCount;
};

// Toggle like on a product
router.post('/:id/like', authMiddleware, async (req, res) => {
    try {
      const { id: productId } = req.params;
      const userId = req.user.id;
  
      let likeEntry = await Likes.findOne({ productId });
  
      if (!likeEntry) {
        // If no entry for the product, create a new one
        likeEntry = await Likes.create({ productId, userIds: [userId] });
        // await Product.findByIdAndUpdate(productId, { $inc: { likes: 1 } });
      } else {
        const userIndex = likeEntry.userIds.indexOf(userId);
  
        if (userIndex === -1) {
          // If user hasn't liked it yet, add the user ID
          likeEntry.userIds.push(userId);
          // await Product.findByIdAndUpdate(productId, { $inc: { likes: 1 } });
        } else {
          // If user has liked it, remove the user ID
          likeEntry.userIds.splice(userIndex, 1);
          // await Product.findByIdAndUpdate(productId, { $inc: { likes: -1 } });
        }
  
        await likeEntry.save();
      }
  
      // const updatedProduct = await Product.findById(productId);
      const likesCount = likeEntry.userIds.length;
      client.setEx(`likes:${productId}`, 3600, likesCount.toString()); // Update the cache
  
      res.status(200).json({
        message: 'Like toggled successfully',
        likes: likesCount,
      });
    } catch (error) {
      console.error('Error toggling likes:', error);
      res.status(500).json({ message: 'Error toggling likes' });
    }
  });

  // Get likes count for a product
  router.get('/:id/count', async (req, res) => {
    try {
      const { id: productId } = req.params;
      const likesCount = await getLikesCount(productId);

      res.status(200).json({ likes: likesCount });
    } catch (error) {
      console.error('Error fetching likes count:', error);
      res.status(500).json({ message: 'Error fetching likes count' });
    }
  });

  // checking like is on product by the user
  router.get('/:id/isLiked', authMiddleware, async (req, res) => {
    try {
      const { id: productId } = req.params;
      const userId = req.user.id;
  
      const existingLike = await Likes.findOne({ userIds: userId, productId });
  
      res.status(200).json({ isLiked: !!existingLike });
    } catch (error) {
      console.error('Error checking like status:', error);
      res.status(500).json({ message: 'Error checking like status' });
    }
  });
  
  
module.exports = router;

 // No need to change any code on frontend or any where for Redis cache
 // Need to install redis from git hub link, and on command prompt, navigate to the redis extrated folder.
 // then run the command redis-server.exe

  // npm install redis

  // https://github.com/tporadowski/redis/releases

  // redis-server.exe
