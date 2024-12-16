// models/Product.js
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  categories: {type: String, enum: ['Clothing', 'Footwear', 'Accessories'], required: true},
  gender: { type: String, enum: ['Male', 'Female', 'Kids'], required: true },
  stockStatus: { type: String, enum: ['In Stock', 'Out-of-stock', 'Getting Ready'], required: true },
  stockCount: { type: Number },
  deliveryDays: { type: Number, required: true },
  description: { type: String, required: true},
  media: [Buffer], // Store images as Buffer data
  videos: [String],
  likes: { type: Number, default: 0 },
  comments: [{ text: String, username: String, createdAt: { type: Date, default: Date.now } }],
});

module.exports = mongoose.model('Product', ProductSchema);
