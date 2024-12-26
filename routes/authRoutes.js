// routes/authRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/userModel');
const router = express.Router();
const { searchUsernames, requestOtp, resetPassword } = require('../controllers/userController');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const multer = require('multer');
const sharp = require('sharp');
const { authMiddleware } = require('../middleware/auth');
// Secret key for JWT (make sure this is in your .env file)
// const JWT_SECRET = process.env.JWT_SECRET || 'qwertyuiop'; //secret key


// Set up Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_PASS  // your email password
  }
});

// Initialize Twilio client
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Initialize multer with memory storage
const upload = multer({
  limits: { fileSize: 2 * 1024 * 1024 }, // Limit file size to 2MB
  storage: multer.memoryStorage(),
});

// POST /api/auth/register
router.post('/register', upload.single('profilePic'), async (req, res) => {
  const { username, password, phone, email } = req.body;

  // Username and password validation
  const usernameRegex = /^[A-Z][A-Za-z0-9@_-]{5,}$/;
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*@).{8,}$/;

  if (!usernameRegex.test(username)) {
    return res.status(400).json({ message: 'Invalid username format.' });
  }

  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: 'Invalid password format.' });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ message: `Username ${username} already exists.` });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ message: `The email ${email} is already registered with another account, use another email instead.` });
      }
    }

    // Process the uploaded profile picture
    let profilePicBuffer = null;
    if (req.file) {
      profilePicBuffer = await sharp(req.file.buffer)
        .resize({ width: 300, height: 300 })
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    // Create and save the new user
    const newUser = new User({ username, password, phone, email, profilePic: profilePicBuffer,});
    await newUser.save();

    console.log('Registered user:', newUser); // Log the newly saved user
    res.status(201).json({ message: `Your new account created with username: ${newUser.username} and ${newUser.email}` });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user', error });
  }
});




// Login Route
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body; // Use "identifier" to accept either email or username

  try {
    // Determine if identifier is an email or username
    const query = identifier.includes('@') ? { email: identifier } : { username: identifier };

    // Find user by either username or email
    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ message: `${identifier.includes('@') ? 'Email' : 'Username'} ${identifier} doesn't exist.` });
    }

    // Compare the provided password with the hashed password stored in the database
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: `Entered password doesn't match to ${identifier.includes('@') ? 'Email' : 'Username'} ${identifier} 's data.` });
    }

    // Generate a JWT token valid for a specified period
    const authToken = jwt.sign({ id: user._id, tokenUsername: user.username }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });
    console.log('Login successful:', user); // Log successful login
    console.log('Login successful:', authToken);
    

    // Respond with success message, token, and username
    return res.status(200).json({
      message: `You are logged in with ${identifier.includes('@') ? 'email' : 'username'}: ${identifier}`,
      authToken,
      tokenUsername: user.username,
      userId: user._id, // for returning user details
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ message: 'Login failed', error });
  }
});

// Refresh Token Route
router.post('/refresh-token', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultSecretKey');
    // Issue a new token with a refreshed expiry time
    const newToken = jwt.sign(
      { id: decoded.id, tokenUsername: decoded.tokenUsername },
      process.env.JWT_SECRET || 'defaultSecretKey',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }// New 1-hour expiry
    );

    return res.status(200).json({ authToken: newToken });
    // console.log('authToken refreshed..!:', newToken);
  } catch (err) {
    return res.status(401).json({ message: 'Refresh token failed. Token expired or invalid.' });
    // console.log('Refresh token failed. Token expired or invalid.');
  }
});


router.get('/search', searchUsernames); // Define search route
// router.post('/forgot-password', requestOtp);
// router.post('/reset-password', resetPassword);

// Route to request OTP
router.post('/request-otp', async (req, res) => {
  const { username, contact } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP

  try {
    // Check if the user exists with the provided username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "Username doesn't match to any existed username" });
    }

    // Check if the contact matches user's email or phone
    const isContactMatched = user.email === contact || user.phone === contact;
    if (!isContactMatched) {
      return res.status(400).json({ message: `Entered email or phone number doesn't match the ${username} data` });
    }
    // Set OTP expiration in IST time by adding 10 minutes
    const otpExpiryIST = new Date(new Date().getTime() + 10 * 60000 + 5.5 * 60 * 60000); // Convert 10 mins to IST
    // Save OTP to user document with expiration
    user.otp = otp;
    user.otpExpiry = otpExpiryIST; // OTP valid for 10 minutes in IST
    await user.save();

    // Send OTP via email or SMS
    if (contact.includes('@')) {
      await transporter.sendMail({
        to: contact,
        subject: 'Password Reset OTP',
        text: `Your TejChat App account password reset OTP is ${otp}. It is valid for 10 minutes.`
      });
    } else {
      await twilioClient.messages.create({
        to: contact,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: `Your TejChat App account password reset OTP is ${otp}. It is valid for 10 minutes.`
      });
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error requesting OTP', error });
  }
});

// Route to resend OTP
router.post('/resend-otp', async (req, res) => {
  const { username, contact } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000); // Generate new 6-digit OTP

  try {
    const user = await User.findOne({ username });
    if (!user || (user.email !== contact && user.phone !== contact)) {
      return res.status(400).json({ message: "User not found or contact does not match" });
    }

    // Update OTP and expiry time
    // Set OTP expiration in IST time by adding 10 minutes
    const otpExpiryIST = new Date(new Date().getTime() + 10 * 60000 + 5.5 * 60 * 60000); // Convert 10 mins to IST
    // Save OTP to user document with expiration
    user.otp = otp;
    user.otpExpiry = otpExpiryIST; // OTP valid for 10 minutes in IST
    await user.save();

    // Send OTP via email or SMS
    if (contact.includes('@')) {
      await transporter.sendMail({
        to: contact,
        subject: 'Password Reset OTP',
        text: `Your TejChat App new OTP is ${otp}. It is valid for 10 minutes.`,
      });
    } else {
      await twilioClient.messages.create({
        to: contact,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: `Your TejChat App new OTP is ${otp}. It is valid for 10 minutes.`,
      });
    }

    res.json({ message: 'New OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error resending OTP', error });
  }
});


// Route to reset password
router.post('/reset-password', async (req, res) => {
  const { username, contact, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ username, $or: [{ email: contact }, { phone: contact }] });
    if (!user || user.otp !== parseInt(otp) || Date.now() > user.otpExpiry) {
      return res.status(400).json({ message: 'Entered OTP is invalid or OTP expired' });
    }
    // Check if new password is different from the existing password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password must be different from the old password' });
    }

    // Hash new password and update user document
    user.password = await bcrypt.hash(newPassword, 12);
    user.otp = null; // Clear OTP after successful reset
    user.otpExpiry = null;
    await user.save();
    console.log('New password is :', user.password);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error });
  }
});


// Route to get seller profile
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  if (req.user.id !== id) return res.status(403).json({ message: 'Unauthorized access' });

  try {
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Convert profilePic to Base64 string if it exists
    const userData = user.toObject();
    if (user.profilePic) {
      userData.profilePic = user.profilePic.toString('base64');
    }

    res.json(userData);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to delete seller account
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  if (req.user.id !== id) return res.status(403).json({ message: 'Unauthorized access' });

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    // await Product.deleteMany({ userId: req.user.id }); // Delete all products added by the seller
    await User.findByIdAndDelete(req.user.id);
    res.status(200).json({ message: 'User account deleted successfully.' });
  } catch (error) {
    console.error('Error deleting seller account:', error);
    res.status(500).json({ message: 'Failed to delete seller account.' });
  }
});

module.exports = router;
