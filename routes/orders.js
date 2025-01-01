// routes/orders.js
const express = require("express");
const { authMiddleware } = require("../middleware/auth");
// const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/userModel");
const Seller = require("../models/sellerModel");
const Product = require("../models/Product");
require("dotenv").config();
const nodemailer = require('nodemailer');

const router = express.Router();
const sharp = require("sharp");
// Place Order
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { productId, productTitle, orderPrice, deliveryAddress, paymentStatus, sellerTitle } = req.body;
    // const { name, phone, email, address } = deliveryAddress; // Extract fields
    const userId = req.user.id;

    const product = await Product.findById(productId);
    if (!product || product.stockCount <= 0) {
      return res.status(400).json({ message: "Product out of stock" });
    }
    console.log("Received Delivery Address:", req.body.deliveryAddress);

    // Construct userDeliveryAddress correctly
    const userDeliveryAddress = {
      name: deliveryAddress.name,
      phone: deliveryAddress.phone,
      email: deliveryAddress.email,
      address: {
        street: deliveryAddress.address.street,
        area: deliveryAddress.address.area,
        city: deliveryAddress.address.city,
        state: deliveryAddress.address.state,
        pincode: deliveryAddress.address.pincode,
      },
      createdAt: new Date(),
    };

    // Process the first image as Base64
    const productPicBuffer = product.media[0]
      ? await sharp(product.media[0]).resize(300, 300).jpeg().toBuffer()
      : null;

    const order = new Order({
      user: userId,
      product: productId,
      productTitle,
      productPic: productPicBuffer, // Save the first image buffer
      orderPrice,
      userDeliveryAddresses: [userDeliveryAddress], // Save as an array
      paymentStatus,
      sellerTitle,
      createdAt: new Date(),
    });

    await order.save();

    // Update product stock
    product.stockCount -= 1;
    await product.save();

    // Reflect order in user and seller data
    const user = await User.findById(userId);
    user.orders.push(order._id); // Assuming 'orders' is an array
    await user.save();

    // Update seller's order list
    const seller = await Seller.findOne({ sellerTitle: product.sellerTitle });
    if (seller) {
      seller.orders.push({
        orderId: order._id,
        buyerInfo: { email: deliveryAddress.email, username: deliveryAddress.name, phone: deliveryAddress.phone },
        userDeliveryAddresses: [userDeliveryAddress],
      });
      await seller.save();
    }

    res.status(201).json(order);
    console.log('payment done & order placed');
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to place order" });
  }
});

// Send Order Confirmation Email to user
router.post("/send-email", authMiddleware, async (req, res) => {
  try {
    const { email, product, deliveryAddress, sellerTitle } = req.body;

    // Ensure media is a valid Buffer
    const firstImageBuffer = Buffer.isBuffer(product.media)
      ? product.media // If already a buffer, use it directly
      : Buffer.from(product.media, "base64"); // Convert from base64 if not a Buffer

    // Compress image
    const compressedImage = await sharp(firstImageBuffer)
    .resize(300, 300) // Resize to thumbnail
    .jpeg({ quality: 80 }) // Compress image
    .toBuffer();
    // Convert compressed image to base64
    const base64Image = compressedImage.toString("base64");
    // Email transporter setup
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // Your email password
      },
    });

    // Email options with embedded image
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Order Confirmation from TejCart",
      html: `
        <h1>Order Confirmation</h1>
        <p>Thank you for your purchase!</p>
        <p><strong>Product:</strong> ${product.title}</p>
        <p><strong>Price:</strong> ₹${product.price}</p>
        <img src="data:image/jpeg;base64,${base64Image}" alt="${product.title}" style="width: 300px; height: auto; border: 1px solid #ddd;" />
        <p><strong>Shipping Address:</strong></p>
        <p>${deliveryAddress.address.street}, ${deliveryAddress.address.area}, ${deliveryAddress.address.city}, ${deliveryAddress.address.state}, ${deliveryAddress.address.pincode}</p>
        <p>Seller: ${sellerTitle}</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Mail sent to ${email}`);
    res.status(200).json({ message: "Email sent successfully!" });
  } catch (err) {
    console.error("Failed to send email", err);
    res.status(500).json({ message: "Failed to send email" });
  }
});

// Get user orders
router.get("/my-orders", authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).populate("product");
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// Get a single order by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const orderData = order.toObject();
    if (order.productPic) {
      orderData.productPic = order.productPic.toString('base64');
    }
     res.json(orderData);
  } catch (err) {
    console.error('Error fetching order by ID:', err);
    res.status(500).json({ message: 'Error fetching order details' });
  }
});

module.exports = router;
