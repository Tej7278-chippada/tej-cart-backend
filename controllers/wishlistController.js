// const Wishlist = require('../models/Wishlist');
// const Product = require('../models/Product');

const Product = require("../models/Product");
const Wishlist = require("../models/wishlistModel");

exports.addToWishlist = async (req, res) => {
  const { productId } = req.body;
  const userId = req.user.id;

  try {
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Check if already in wishlist
    const exists = await Wishlist.findOne({ user: userId, product: productId });
    if (exists) return res.status(400).json({ message: 'Product already in wishlist' });

    // Add to wishlist
    const wishlistItem = new Wishlist({ user: userId, product: productId });
    await wishlistItem.save();

    res.status(201).json({ message: 'Product added to wishlist', wishlistItem });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getWishlist = async (req, res) => {
  const userId = req.user.id;

  try {
    const wishlist = await Wishlist.find({ user: userId }).populate('product');
    res.status(200).json(wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removeFromWishlist = async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  try {
    const wishlistItem = await Wishlist.findOneAndDelete({ user: userId, product: productId });
    if (!wishlistItem) return res.status(404).json({ message: 'Product not found in wishlist' });

    res.status(200).json({ message: 'Product removed from wishlist' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
