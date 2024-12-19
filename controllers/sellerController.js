// /controllers/userController.js
const Seller = require('../models/sellerModel');
// const User = require('../models/userModel');
// const sendOtp = require('../utils/sendOtp');
const bcrypt = require('bcryptjs');

// Search usernames in the database
exports.searchUsernamesSeller = async (req, res) => {
  try {
    const searchTerm = req.query.username; // Get search term from query params

    if (!searchTerm) {
      return res.status(400).json({ message: 'No search term provided' });
    }

    // Find usernames that contain the search term
    const sellers = await Seller.find({ 
      username: { $regex: searchTerm, $options: 'i' } // Case-insensitive match
    }).select('usernameSeller'); // Return only the username field

    res.json(sellers);
  } catch (error) {
    res.status(500).json({ message: 'Error searching sellers usernames', error });
  }
};


