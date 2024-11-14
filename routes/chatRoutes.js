const express = require('express');
const router = express.Router();
const cryptoJS = require('crypto-js');
const Message = require('../models/messageModel');
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');

// Example Encryption Key (use more secure method in production)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

router.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Create a new user
  const newUser = new User({ username, password });
  await newUser.save();

  res.status(201).json({ message: 'User created successfully', user: newUser });
});

router.post('/sendMessage', async (req, res) => {
  const { senderId, receiverId, message } = req.body;

  // Encrypt the message
  const encryptedMessage = cryptoJS.AES.encrypt(message, ENCRYPTION_KEY).toString();

  const newMessage = new Message({ sender: senderId, receiver: receiverId, encryptedMessage });
  await newMessage.save();
  res.status(200).json({ success: true, message: 'Message sent!' });
});

router.get('/getMessages/:senderId/:receiverId', async (req, res) => {
  const { senderId, receiverId } = req.params;

  const messages = await Message.find({
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId },
    ],
  });

  // Decrypt messages
  const decryptedMessages = messages.map(msg => {
    const decryptedMessage = cryptoJS.AES.decrypt(msg.encryptedMessage, ENCRYPTION_KEY).toString(cryptoJS.enc.Utf8);
    return { ...msg._doc, decryptedMessage };
  });

  res.status(200).json(decryptedMessages);
});

module.exports = router;
