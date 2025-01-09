// models/Order.js
const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productTitle: { type: String, required: true },
  productPic: { type: Buffer }, // Stores image data as Buffer
  orderPrice: { type: Number, required: true },
  userDeliveryAddresses: [{ name: String, phone: String, email: String, address: {
    street: { type: String, required: true },
    area: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  }, createdAt: { type: Date, default: Date.now } }],
  paymentStatus: { type: String, enum: ["Pending", "Completed", "Failed"], required: true },
  sellerTitle: { type: String, required: true }, // Bind to seller's title
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true }, // Bind to seller's ID
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTej' }, // Bind to payment's ID
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", OrderSchema);
