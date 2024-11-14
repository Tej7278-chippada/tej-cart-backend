// routes/products.js
const express = require('express');
const multer = require('multer');
const Product = require('../models/Product');
const router = express.Router();
const sharp = require('sharp');

// Multer setup for file uploads // Backend: Setting up Multer to accept a "media" field for images or videos
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/'); // Specify the folder for storing files
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + '-' + file.originalname); // Generate unique filename
//   }
// });

// Configure multer to store files in memory as buffers
const storage = multer.memoryStorage();

// Initialize multer with the storage configuration
const upload = multer({
  limits: { fileSize: 2 * 1024 * 1024 }, // Limit file size to 5MB
  storage: multer.memoryStorage(),
});

// Add product
router.post('/add/products', upload.array('media', 5), async (req, res) => {
  try {
    const { title, price, stockStatus, stockCount, gender, deliveryDays, description } = req.body;
    // Log incoming form data and file data
    console.log("Form data:", req.body);
    console.log("Files:", req.files);
    // Process the uploaded files
    const compressedImages = await Promise.all(
      req.files.map(async (file) => {
        const buffer = await sharp(file.buffer)
          .resize({ width: 800 }) // Resize to 800px width, maintaining aspect ratio
          .jpeg({ quality: 20 }) // Compress to 70% quality
          .toBuffer();
        return buffer;
      })
    );

    const product = new Product({
      title,
      price,
      stockStatus,
      stockCount: stockStatus === 'In Stock' ? stockCount : undefined,
      gender,
      deliveryDays,
      description,
      media: compressedImages,
    });
    await product.save();
    res.status(201).json({ product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding product', error: err.message });
  }
});

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    // res.json(products);
    // Convert each product's media buffer to base64
    // Convert each image buffer in `media` to a base64 string
    // res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    const productsWithBase64Media = products.map((product) => ({
      ...product._doc,
      media: product.media.map((buffer) => buffer.toString('base64')),
    }));
    res.json(productsWithBase64Media);
    
    

  } catch (err) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// Update product
router.put('/:id', upload.array('media', 5), async (req, res) => {
  try {
    const { title, price, stockStatus, stockCount, gender, deliveryDays, description } = req.body;
    
    const compressedImages = req.files ? await Promise.all(
      req.files.map(async (file) => {
        const buffer = await sharp(file.buffer)
          .resize({ width: 800 })
          .jpeg({ quality: 20 })
          .toBuffer();
        return buffer;
      })
    ) : undefined;

    const updateData = {
      title,
      price,
      stockStatus,
      stockCount: stockStatus === 'In Stock' ? stockCount : undefined,
      gender,
      deliveryDays,
      description,
    };

    if (compressedImages) {
      updateData.media = compressedImages;
    }

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedProduct);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating product' });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting product' });
  }
});

// Add a comment
router.post('/products/:id/comment', async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    /* const newComment = { text }; */
    product.comments.push({ text });
    await product.save();
    console.log('Product ID:', productId);

    res.status(200).json({ message: 'Comment added', comments: product.comments });
  } catch (error) {
    console.error("Failed to add comment:", error);
    res.status(500).json({ message: 'Server error', error });
  }
});

module.exports = router;
