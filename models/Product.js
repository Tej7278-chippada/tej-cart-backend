// models/Product.js
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  stockStatus: { type: String, enum: ['In Stock', 'Out-of-stock', 'Getting Ready'], required: true },
  stockCount: { type: Number },
  gender: { type: String, enum: ['Male', 'Female', 'Kids'], required: true },
  deliveryDays: { type: Number, required: true },
  description: { type: String },
  media: [Buffer], // Store images as Buffer data
  videos: [String],
  likes: { type: Number, default: 0 },
  comments: [{ text: String, createdAt: { type: Date, default: Date.now } }],
});

module.exports = mongoose.model('Product', ProductSchema);
