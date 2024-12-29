const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/userModel");
const Seller = require("../models/sellerModel");

const router = express.Router();

// Place Order
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { productId, address, paymentStatus } = req.body;
    const userId = req.user.id;

    const product = await Product.findById(productId);
    if (!product || product.stockCount <= 0) {
      return res.status(400).json({ message: "Product out of stock" });
    }

    const order = new Order({
      user: userId,
      product: productId,
      address,
      paymentStatus,
      createdAt: new Date(),
    });

    await order.save();

    // Update product stock
    product.stockCount -= 1;
    await product.save();

    // Reflect order in user and seller data
    const user = await User.findById(userId);
    user.orders.push(order._id);
    await user.save();

    const seller = await Seller.findOne({ sellerTitle: product.sellerTitle });
    if (seller) {
      seller.orders.push({
        orderId: order._id,
        buyerInfo: { email: req.user.email, username: req.user.username, phone: req.user.phone },
        address,
      });
      await seller.save();
    }

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to place order" });
  }
});

// Get user orders
router.get("/my-orders", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).populate("product");
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

module.exports = router;
