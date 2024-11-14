// models/userModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define user schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  otp: { type: Number },
  otpExpiry: { type: Date }
});

// Hash the password before saving the user
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); // Only hash if the password is new or modified
  try {
    if (this.isNew) {
      this.password = await bcrypt.hash(this.password, 12); // Hashing the password with 12 salt rounds
    }
    console.log('Hashed password:', this.password); // Log the hashed password for debugging
    next();
  } catch (err) {
    return next(err);
  }
});

// Method to compare input password with hashed password
userSchema.methods.comparePassword = async function (inputPassword) {
  try {
    const isMatch = await bcrypt.compare(inputPassword, this.password);
    console.log('Password match result:', isMatch); // Log the result of the comparison
    return isMatch;
  } catch (err) {
    throw new Error(err);
  }
};

const User = mongoose.model('User', userSchema);
module.exports = User;
