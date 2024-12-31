// /models/paymentModel.js
const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    razorpay_order_id: { type: String, required: true },
    razorpay_payment_id: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, required: true, enum: ["created", "captured", "failed", "Decliened", "refunded"], default: "created" },
    contact: { type: String },
    email: { type: String },
    payment_method: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentTej", PaymentSchema);
