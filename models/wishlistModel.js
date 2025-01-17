// models/wishlistModel.js
const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
  ],
}, { timestamps: true });

const Wishlist0 = mongoose.model('Wishlist0', wishlistSchema);

module.exports = Wishlist0;
