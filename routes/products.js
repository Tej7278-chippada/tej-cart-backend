// routes/products.js
const express = require('express');
const multer = require('multer');
const Product = require('../models/Product');
const router = express.Router();
const sharp = require('sharp');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/userModel');


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
    const { title, price, categories, gender, stockStatus, stockCount, deliveryDays, description } = req.body;
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
      categories,
      gender,
      stockStatus,
      stockCount: stockStatus === 'In Stock' ? stockCount : undefined,
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

// Get all products with optional filters
router.get('/', async (req, res) => {
  try {
    // Extract filter parameters from query string
    const { title, price, categories, gender, stockStatus } = req.query;

    // Build a filter object based on the available query parameters
    const filter = {};
    if (title) {
      filter.title = { $regex: title, $options: 'i' }; // Case-insensitive search for title
    }
    if (price) {
      const [minPrice, maxPrice] = price.split('-'); // Assuming the price range is passed as "minPrice-maxPrice"
      if (minPrice && maxPrice) {
        filter.price = { $gte: minPrice, $lte: maxPrice };
      }
    }
    if (categories) {
      filter.categories = { $in: categories.split(',') }; // Assuming multiple categories are passed as comma-separated string
    }
    if (gender) {
      filter.gender = gender; // Filter by gender
    }
    if (stockStatus) {
      filter.stockStatus = stockStatus; // Filter by stock status
    }

    // Fetch products with the applied filters
    const products = await Product.find(filter);

    // Convert each product's media buffer to base64
    const productsWithBase64Media = products.map((product) => ({
      ...product._doc,
      media: product.media.map((buffer) => buffer.toString('base64')),
    }));

    res.json(productsWithBase64Media);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// Update product
router.put('/:id', upload.array('media', 5), async (req, res) => {
  try {
    const { title, price, categories, gender, stockStatus, stockCount, deliveryDays, description } = req.body;
    
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
      categories,
      gender,
      stockStatus,
      stockCount: stockStatus === 'In Stock' ? stockCount : undefined,
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


// Like a product
// Toggle like on a product
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Get the logged-in user ID from the middleware

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const user = await User.findById(userId); // Get the user
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already liked the product
    const likedIndex = user.likedProducts?.indexOf(id);

    if (likedIndex !== -1) {
      // If already liked, remove the like
      user.likedProducts.splice(likedIndex, 1);
      product.likes = Math.max(product.likes - 1, 0); // Prevent negative likes
    } else {
      // If not liked, add the like
      user.likedProducts = user.likedProducts || [];
      user.likedProducts.push(id);
      product.likes += 1;
    }

    await user.save();
    await product.save();

    res.status(200).json({ message: 'Like toggled successfully', likes: product.likes });
  } catch (error) {
    console.error('Error toggling likes:', error);
    res.status(500).json({ message: 'Error toggling likes' });
  }
});


// Add a comment
router.post('/:id/comment', async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const product = await Product.findById(id); 
    // const product = await Product.findByIdAndUpdate(
    //   id,
    //   { $push: { comments: { text, createdAt: new Date() } } },
    //   { new: true }
    // );
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const newComment = { text, createdAt: new Date() };
    product.comments.push(newComment);

    await product.save();
    res.status(200).json(product);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// router.get('/:id', async (req, res) => {
//   try {
//     const product = await Product.findById(req.params.id);
//     if (!product) {
//       return res.status(404).json({ message: 'Product not found' });
//     }
//     res.json(product);
//   } catch (error) {
//     console.error('Error fetching product by ID:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// Get a single product by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const userId = req.user.id; // Get the logged-in user ID
    const user = await User.findById(userId);

    const isLiked = user.likedProducts?.includes(product._id.toString()); // Check if user liked the product

    const productWithBase64Media = {
      ...product._doc,
      media: product.media.map((buffer) => buffer.toString('base64')),
      likedByUser: isLiked, // Add the liked status for this user
    };

    res.json(productWithBase64Media);
  } catch (err) {
    console.error('Error fetching product by ID:', err);
    res.status(500).json({ message: 'Error fetching product details' });
  }
});


module.exports = router;
