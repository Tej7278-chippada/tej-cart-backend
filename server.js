// server.js
const express = require('express');
const bodyParser = require("body-parser");
// const mongoose = require('mongoose');
require('dotenv').config(); // Load .env variables
const dotenv = require("dotenv");
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/authRoutes');
const sellerRoutes = require('./routes/sellerAccountRoutes');
const sellerOrders = require('./routes/sellerOrdersRoutes');
const cors = require('cors');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const wishlist = require('./models/wishlistModel');
const Razorpay = require("razorpay");
const orderRoutes = require("./routes/orders");
const paymentRoutes = require("./routes/Payment");
const paymentModel = require('./models/paymentModel');
const likesRoutes = require('./routes/likesRoutes');

dotenv.config();
const app = express();
// Increase payload size
app.use(bodyParser.json({ limit: "10mb" })); // Adjust size as per your requirement
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
connectDB();
// Add these lines to parse JSON and URL-encoded data
// Middleware
app.use(express.json()); // To parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// Allow CORS
app.use(cors());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
//     console.log('MongoDB Connected');
//   } catch (error) {
//     console.error('MongoDB connection failed', error);
//     process.exit(1);
//   }
// };
// connectDB();

// Define the API route
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find(); // Fetch all messages from the database
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Define routes
app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes); // Mount the user routes at /api/users
app.use('/api/seller', sellerRoutes); // Mount the user routes at /api/users
app.use('/api/sellerOrders', sellerOrders);
app.use('/api/products', require('./routes/products'));
app.use('/api/productSeller', require('./routes/productRoutes'));
// app.use('/api/offers', require('./routes/offers'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use("/api/orders", orderRoutes);
// app.use("/api/payments", paymentRoutes);
app.use("/api/likes", likesRoutes);

// Payment Route
app.post("/api/payments", async (req, res) => {
  const { amount, contact, email, payment_method } = req.body; // Include contact and email in the request
  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // Amount in paise
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    });

    // Save order details to MongoDB
    const payment = new paymentModel({
      razorpay_order_id: order.id,
      amount: order.amount / 100, // Convert paise to rupees
      currency: order.currency,
      status: "created",
      created_at: new Date(),
      contact : contact || "N/A",
      email : email || "N/A",
      payment_method : payment_method || "N/A",
    });
    await payment.save();

    res.json(order);
  } catch (error) {
    console.error("Razorpay order creation failed:", error);
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
});


app.post("/api/payments/update", async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, status,
    contact,
    email,
    payment_method, } = req.body;

  try {
    // Verify payment signature (optional but recommended for security)
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (razorpay_signature !== expectedSignature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // Update the payment status in the database
    const updatedPayment = await paymentModel.findOneAndUpdate(
      { razorpay_order_id },
      {
        razorpay_payment_id,
        status: "captured",
        contact : contact || "N/A",
        email : email || "N/A",
        payment_method : payment_method || "N/A",
        updated_at: new Date(),
      },
      { new: true }
    );

    if (!updatedPayment) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(updatedPayment);
  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).json({ error: "Failed to update payment" });
  }
});





// Define your route to serve images by ID
app.get('/:id', async (req, res) => {
    try {
      const media = await Product.findById(req.params.id);
      if (media) {
        res.set('Content-Type', 'image/jpeg');
        res.send(Buffer.from(media.data, 'base64')); // Assuming `media.data` is stored as base64
      } else {
        res.status(404).send('Image not found');
      }
    } catch (error) {
      console.error('Error fetching image:', error);
      res.status(500).send('Server error');
    }
  });
const PORT = process.env.PORT || 5009;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port http://192.168.66.172:${PORT}`));

// Connect to MongoDB
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => { 
//     console.log('MongoDB Connected');
//     app.listen(PORT, () => 
//       console.log(`Server running on port ${PORT}`));
//   }) .catch(err => console.error('MongoDB Connection Error:', err));

