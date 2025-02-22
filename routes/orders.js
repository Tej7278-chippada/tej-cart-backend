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
const { uploadImageToCloud } = require("../utils/aws");
const paymentModel = require("../models/paymentModel");


// Place Order
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { productId, productTitle, orderPrice, deliveryAddress, paymentStatus, sellerTitle, sellerId, razorpay_order_id } = req.body;
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
      ? await sharp(product.media[0]).resize({ width: 300 }).jpeg().toBuffer() //resize(300, 300)
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
      sellerId,
      createdAt: new Date(),
    });

    await order.save();

    // Retrieve the payment record associated with this user
    const paymentRecord = await paymentModel.findOne({ razorpay_order_id: razorpay_order_id });
    if (paymentRecord) {
      // Update the corresponding Payment record with the orderId
      paymentRecord.orderId = order._id;
      paymentRecord.updatedAt = new Date();
      await paymentRecord.save();

      // Bind the paymentId to the order
      order.paymentId = paymentRecord._id;
      await order.save();
      
      console.log("order id saved on payment's data...");
    } else {
      console.log("order id can not saved on payment's data..!");
    }

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
        createdAt: new Date(),
      });
      await seller.save();
    }

    res.status(201).json(order);
    console.log('payment done & order placed...');
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to place order" });
  }
});

// Send Order Confirmation Email to user
router.post("/send-email", authMiddleware, async (req, res) => {
  try {
    const { email, product, deliverTo, contactTo, deliveryAddress, deliveryDate, sellerTitle } = req.body;

    // Convert the product media buffer to a Base64 string
    const firstImageBuffer = Buffer.isBuffer(product.media)  // Upload image to S3
      ? product.media // If already a buffer, use it directly
      : Buffer.from(product.media, "base64"); // Convert from base64 if not a Buffer

    // // Compress the image using Sharp
    // const compressedImage = await sharp(firstImageBuffer)
    // .resize(300, 300) // Resize to thumbnail
    // // .toFormat("jpeg") // Ensure the format is JPEG
    // .jpeg({ quality: 80 }) // Compress image
    // .toBuffer();

    // // Convert the compressed image to Base64 with the correct MIME type
    // const base64Image = compressedImage.toString("base64");

    // Upload the image to S3 and get the public URL
    const imageUrl = await uploadImageToCloud(firstImageBuffer);

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
        <img src="${imageUrl}" alt="${product.title}" style="width: 300px; height: auto; border: 1px solid #ddd;" />
        <p><strong>Product:</strong> ${product.title}</p>
        <p><strong>Price:</strong> ₹${product.price}</p>
        <p><strong>Deliver to :</strong> ${deliverTo}</p>
        <p><strong>Phone no :</strong> ${contactTo}</p>
        <p><strong>Shipping Address:</strong></p>
        <p>${deliveryAddress.address.street}, ${deliveryAddress.address.area}, ${deliveryAddress.address.city}, ${deliveryAddress.address.state}, ${deliveryAddress.address.pincode}</p>
        <p>Product will deliver in ${deliveryDate} days to your address.</p>
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
    // Convert productPic (Buffer) to Base64 for the frontend
    const ordersWithImages = orders.map(order => ({
      ...order.toObject(),
      productPic: order.productPic ? order.productPic.toString("base64") : null,
    }));
    res.json(ordersWithImages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// Get a single order by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('paymentId');
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
