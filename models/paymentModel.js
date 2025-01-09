// /models/paymentModel.js
const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    razorpay_order_id: { type: String, required: true },
    razorpay_payment_id: { type: String, default: null },
    razorpay_signature: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, required: true, enum: ["created", "captured", "failed", "Decliened", "refunded"], default: "created" },
    name: { type: String },
    contact: { type: String },
    email: { type: String },
    payment_method: { type: String },
    order_title: { type: String },
    seller_title: { type: String },
    // created_at: { type: Date, default: Date.now },
    // updated_at: { type: Date },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller" },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentTej", PaymentSchema);
