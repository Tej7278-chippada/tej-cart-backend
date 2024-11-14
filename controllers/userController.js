// /controllers/userController.js
const User = require('../models/userModel');
// const sendOtp = require('../utils/sendOtp');
const bcrypt = require('bcryptjs');

// Search usernames in the database
exports.searchUsernames = async (req, res) => {
  try {
    const searchTerm = req.query.username; // Get search term from query params

    if (!searchTerm) {
      return res.status(400).json({ message: 'No search term provided' });
    }

    // Find usernames that contain the search term
    const users = await User.find({ 
      username: { $regex: searchTerm, $options: 'i' } // Case-insensitive match
    }).select('username'); // Return only the username field

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error searching usernames', error });
  }
};


