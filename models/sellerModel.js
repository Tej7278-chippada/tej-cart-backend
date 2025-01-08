// models/sellerModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Function to generate unique seller ID
const generateSellerId = () => {
  const letters = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 3); // First 3 characters as random uppercase letters
  const numbers = crypto.randomBytes(3).toString('hex').slice(0, 5); // Remaining 5 characters as numbers
  return letters + numbers;
};

// Define seller schema
const sellerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  sellerId: { type: String, required: true, unique: true, default: generateSellerId },
  sellerTitle: { type: String, required: true },
  address: {
    street: { type: String, required: true },
    area: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  profilePic: { type: Buffer }, // Stores image data as Buffer
  likedProducts: { type: [mongoose.Schema.Types.ObjectId], ref: 'Product', default: [] },
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    addedAt: { type: Date, default: Date.now }
  }],
  orders: [
    {
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true }, // Order reference
      buyerInfo: {
        email: { type: String, required: true },
        username: { type: String, required: true },
        phone: { type: String, required: true }
      },
      userDeliveryAddresses: [{ name: String, phone: String, email: String, address: {
        street: { type: String, required: true },
        area: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
      }, createdAt: { type: Date, default: Date.now } }],
    },
    {createdAt: { type: Date, default: Date.now }},
  ],
  otp: { type: Number },
  otpExpiry: { type: Date }
});

// Hash the password before saving the seller
sellerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); // Only hash if the password is new or modified
  try {
    this.password = await bcrypt.hash(this.password, 12); // Hashing the password with 12 salt rounds
    next();
  } catch (err) {
    return next(err);
  }
});

// Method to compare input password with hashed password
sellerSchema.methods.comparePassword = async function (inputPassword) {
  try {
    return await bcrypt.compare(inputPassword, this.password);
  } catch (err) {
    throw new Error(err);
  }
};

const Seller = mongoose.model('Seller', sellerSchema);
module.exports = Seller;

