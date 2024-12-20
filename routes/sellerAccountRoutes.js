// routes/authRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
// const User = require('../models/userModel');
const router = express.Router();
const { searchUsernamesSeller, requestOtp, resetPassword } = require('../controllers/sellerController');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const Seller = require('../models/sellerModel');
const multer = require('multer');
const sharp = require('sharp');

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

// Seller Registration
router.post('/sellerRegister', upload.single('profilePic'), async (req, res) => {
  const { username, sellerTitle, password, phone, email, address } = req.body;

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
    // Check if seller already exists
    const existingSeller = await Seller.findOne({ $or: [{ username }, { email }] });
    if (existingSeller) {
      if (existingSeller.username === username) {
        return res.status(400).json({ message: `Username ${username} already exists.` });
      }
      if (existingSeller.email === email) {
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
    const newSeller = new Seller({ username, sellerTitle, password, phone, email, address: JSON.parse(address), profilePic: profilePicBuffer,});
    await newSeller.save();

    console.log('Registered seller:', newSeller); // Log the newly saved seller
    res.status(201).json({ message: `Your new account created with username: ${newSeller.username} and ${newSeller.sellerTitle}` });
  } catch (error) {
    console.error('Error registering seller:', error);
    res.status(500).json({ message: 'Error registering seller', error });
  }
});




// Seller Login
router.post('/sellerLogin', async (req, res) => {
  const { identifier, password } = req.body; // Use "identifier" to accept either email or username

  try {
    // Determine if identifier is an email or username
    const query = identifier.includes('@') ? { email: identifier } : { username: identifier };

    // Find user by either username or email
    const seller = await Seller.findOne(query);
    if (!seller) {
      return res.status(404).json({ message: `${identifier.includes('@') ? 'Email' : 'Username'} ${identifier} doesn't exist.` });
    }

    // Compare the provided password with the hashed password stored in the database
    const isPasswordMatch = await bcrypt.compare(password, seller.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: `Entered password doesn't match to ${identifier.includes('@') ? 'Email' : 'Username'} ${identifier} 's data.` });
    }

    // Generate a JWT token valid for a specified period
    const authTokenSeller = jwt.sign({ id: seller._id, tokenSellerUsername: seller.username }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });
    console.log('Login successful:', seller); // Log successful login
    console.log('Login successful:', authTokenSeller);
    

    // Respond with success message, token, and username
    return res.status(200).json({
      message: `You are logged in with ${identifier.includes('@') ? 'email' : 'username'}: ${identifier}`,
      authTokenSeller,
      tokenSellerUsername: seller.username,
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ message: 'Login failed', error });
  }
});

// Refresh Token Route
router.post('/sellerRefresh-token', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultSecretKey');
    // Issue a new token with a refreshed expiry time
    const newToken = jwt.sign(
      { id: decoded.id, tokenSellerUsername: decoded.tokenSellerUsername },
      process.env.JWT_SECRET || 'defaultSecretKey',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }// New 1-hour expiry
    );

    return res.status(200).json({ authTokenSeller: newToken });
    // console.log('authToken refreshed..!:', newToken);
  } catch (err) {
    return res.status(401).json({ message: 'Refresh token failed. Token expired or invalid.' });
    // console.log('Refresh token failed. Token expired or invalid.');
  }
});


router.get('/searchSeller', searchUsernamesSeller); // Define search route
// router.post('/forgot-password', requestOtp);
// router.post('/reset-password', resetPassword);

// Route to request OTP
router.post('/sellerRequest-otp', async (req, res) => {
  const { username, contact } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP

  try {
    // Check if the user exists with the provided username
    const seller = await Seller.findOne({ username });
    if (!seller) {
      return res.status(404).json({ message: "Username doesn't match to any existed seller's username" });
    }

    // Check if the contact matches user's email or phone
    const isContactMatched = seller.email === contact || seller.phone === contact;
    if (!isContactMatched) {
      return res.status(400).json({ message: `Entered email or phone number doesn't match the ${username} data` });
    }
    // Set OTP expiration in IST time by adding 10 minutes
    const otpExpiryIST = new Date(new Date().getTime() + 10 * 60000 + 5.5 * 60 * 60000); // Convert 10 mins to IST
    // Save OTP to user document with expiration
    seller.otp = otp;
    seller.otpExpiry = otpExpiryIST; // OTP valid for 10 minutes in IST
    await seller.save();

    // Send OTP via email or SMS
    if (contact.includes('@')) {
      await transporter.sendMail({
        to: contact,
        subject: 'Password Reset OTP',
        text: `Your TejChat App seller account password reset OTP is ${otp}. It is valid for 10 minutes.`
      });
    } else {
      await twilioClient.messages.create({
        to: contact,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: `Your TejChat App seller account password reset OTP is ${otp}. It is valid for 10 minutes.`
      });
    }

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error requesting OTP', error });
  }
});

// Route to resend OTP
router.post('/sellerResend-otp', async (req, res) => {
  const { username, contact } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000); // Generate new 6-digit OTP

  try {
    const seller = await Seller.findOne({ username });
    if (!seller || (seller.email !== contact && seller.phone !== contact)) {
      return res.status(400).json({ message: "User not found or contact does not match" });
    }

    // Update OTP and expiry time
    // Set OTP expiration in IST time by adding 10 minutes
    const otpExpiryIST = new Date(new Date().getTime() + 10 * 60000 + 5.5 * 60 * 60000); // Convert 10 mins to IST
    // Save OTP to seller document with expiration
    seller.otp = otp;
    seller.otpExpiry = otpExpiryIST; // OTP valid for 10 minutes in IST
    await seller.save();

    // Send OTP via email or SMS
    if (contact.includes('@')) {
      await transporter.sendMail({
        to: contact,
        subject: 'Password Reset OTP',
        text: `Your TejChat App seller account new OTP is ${otp}. It is valid for 10 minutes.`,
      });
    } else {
      await twilioClient.messages.create({
        to: contact,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: `Your TejChat App seller account new OTP is ${otp}. It is valid for 10 minutes.`,
      });
    }

    res.json({ message: 'New OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error resending new OTP', error });
  }
});


// Route to reset password
router.post('/sellerReset-password', async (req, res) => {
  const { username, contact, otp, newPassword } = req.body;

  try {
    const seller = await Seller.findOne({ username, $or: [{ email: contact }, { phone: contact }] });
    if (!seller || seller.otp !== parseInt(otp) || Date.now() > seller.otpExpiry) {
      return res.status(400).json({ message: 'Entered OTP is invalid or OTP expired' });
    }
    // Check if new password is different from the existing password
    const isSamePassword = await bcrypt.compare(newPassword, seller.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password must be different from the old password' });
    }

    // Hash new password and update user document
    seller.password = await bcrypt.hash(newPassword, 12);
    seller.otp = null; // Clear OTP after successful reset
    seller.otpExpiry = null;
    await seller.save();
    console.log('New password is :', seller.password);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error });
  }
});

// Get Seller Details
router.get('/:sellerId', async (req, res) => {
  const { sellerId } = req.params;

  try {
    const seller = await Seller.findOne({ sellerId }).select('-password');
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found.' });
    }

    res.status(200).json(seller);
  } catch (error) {
    console.error('Error fetching seller details:', error);
    res.status(500).json({ message: 'Error fetching seller details', error });
  }
});

module.exports = router;
