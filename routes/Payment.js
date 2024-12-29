const express = require("express");
const Razorpay = require("razorpay");
const { authMiddleware } = require("../middleware/auth");
const Payment = require("../models/payment");
// const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Payment Initialization
router.post("/", authMiddleware, async (req, res) => {
  const { amount } = req.body;
  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // Amount in paise
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    });

    const payment = new Payment({
      razorpay_order_id: order.id,
      amount: order.amount / 100,
      currency: order.currency,
      status: "created",
      createdAt: new Date(),
    });

    await payment.save();
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to initiate payment" });
  }
});

// Payment Update
router.post("/update", authMiddleware, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, status } = req.body;
  try {
    const payment = await Payment.findOneAndUpdate(
      { razorpay_order_id },
      { razorpay_payment_id, razorpay_signature, status },
      { new: true }
    );

    res.json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update payment" });
  }
});

module.exports = router;
