// routes/sellerOrdersRoutes.js

const express = require('express');
const Seller = require('../models/sellerModel');
const { authSellerMiddleware } = require('../middleware/sellerAuth');
const Order = require('../models/Order');
const router = express.Router();

// Fetch seller orders
router.get('/orders', authSellerMiddleware, async (req, res) => {
    try {
      const sellerId = req.seller.id; // From decoded token
      const seller = await Seller.findOne({ _id: sellerId }).populate('orders.orderId');
  
      if (!seller) {
        return res.status(404).json({ message: 'Seller not found' });
      }
  
      res.json(seller.orders);
    } catch (err) {
      console.error('Error fetching orders:', err.message); // Log error
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });
  
// Get seller orders
router.get("/sellerOrders", authSellerMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ sellerId: req.seller.id }).populate("product");
    // Convert productPic (Buffer) to Base64 for the frontend
    const ordersWithImages = orders.map(order => ({
      ...order.toObject(),
      productPic: order.productPic ? order.productPic.toString("base64") : null,
    }));
    res.json(ordersWithImages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});
module.exports = router;
