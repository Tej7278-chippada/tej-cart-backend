// models/messageModel.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  encryptedMessage: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },

  username: { type: String, required: true },
  content: { type: String, required: true },
});

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
