// routes/productRoutes.js
const express = require('express');
const multer = require('multer');
// const Product = require('../models/productModel');
const router = express.Router();
const sharp = require('sharp');
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/userModel');
const Seller = require('../models/sellerModel');
const Product = require('../models/productModel');
const { authSellerMiddleware } = require('../middleware/sellerAuth');

// Configure multer to store files in memory as buffers
const storage = multer.memoryStorage();

// Initialize multer with the storage configuration
const upload = multer({
  limits: { fileSize: 2 * 1024 * 1024 }, // Limit file size to 5MB
  storage: multer.memoryStorage(),
});

// Add product (only by authenticated seller)
router.post('/add', authSellerMiddleware, upload.array('media', 5), async (req, res) => {
  try {
    const { title, price, categories, gender, stockStatus, stockCount, deliveryDays, description } = req.body;

    const sellerId = req.seller.id;
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const compressedImages = await Promise.all(
      req.files.map(async (file) => {
        const buffer = await sharp(file.buffer)
          .resize({ width: 800 })
          .jpeg({ quality: 20 })
          .toBuffer();
        return buffer;
      })
    );

    const product = new Product({
      sellerId,
      sellerTitle: seller.sellerTitle,
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
    res.status(201).json({ message: 'Product added successfully.', product });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ message: 'Error adding product', error: err.message });
  }
});

// Get products by authenticated seller
router.get('/my-products', authSellerMiddleware, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const products = await Product.find({ sellerId });
    if (!products) {
      return res.status(404).json({ message: 'No products found for this seller.' });
    }
    // Convert each product's media buffer to base64
    const productsWithBase64Media = products.map((product) => ({
      ...product._doc,
      media: product.media.map((buffer) => buffer.toString('base64')),
    }));
    
    res.status(200).json( productsWithBase64Media );
  } catch (err) {
    console.error('Error fetching seller products:', err);
    res.status(500).json({ message: 'Failed to fetch seller products' });
  }
});

// Get all products (public)
router.get('/all', async (req, res) => {
  try {
    const products = await Product.find().populate('sellerId', 'sellerTitle');
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});





// Get all products with optional filters
router.get('/', async (req, res) => {
  try {
    // Extract filter parameters from query string
    const { sellerId, title, price, categories, gender, stockStatus } = req.query;

    // Build a filter object based on the available query parameters
    const filter = {};
    if (sellerId) {
        filter.sellerId = sellerId;
      }
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

// Update product (only by the seller who added it)
router.put('/:id', authSellerMiddleware, upload.array('media', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.seller.id;

    const product = await Product.findOne({ _id: id, sellerId });
    if (!product) {
      return res.status(403).json({ message: 'You are not authorized to update this product' });
    }

    const { title, price, categories, gender, stockStatus, stockCount, deliveryDays, description, existingMedia } = req.body;

    // Parse existingMedia to get the IDs of media to keep
    const mediaToKeep = existingMedia ? JSON.parse(existingMedia) : [];

    // Filter existing media to remove any that are not in mediaToKeep
    product.media = product.media.filter((_, index) => mediaToKeep.includes(index.toString()));

    // Add new media if provided
    if (req.files) {
      const compressedImages = await Promise.all(
        req.files.map(async (file) => {
          const buffer = await sharp(file.buffer)
            .resize({ width: 800 })
            .jpeg({ quality: 20 })
            .toBuffer();
          return buffer;
        })
      );
      product.media.push(...compressedImages);
    }

    // Update other product fields
    product.title = title;
    product.price = price;
    product.categories = categories;
    product.gender = gender;
    product.stockStatus = stockStatus;
    product.stockCount = stockStatus === 'In Stock' ? stockCount : undefined;
    product.deliveryDays = deliveryDays;
    product.description = description;

    await product.save();
    res.json(product);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: 'Error updating product' });
  }
});

// Delete product (only by the seller who added it)
router.delete('/:id', authSellerMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.seller.id;

    const product = await Product.findOneAndDelete({ _id: id, sellerId });
    if (!product) {
      return res.status(403).json({ message: 'You are not authorized to delete this product' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
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
router.post('/:id/comment', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const user = req.user; // Extracted user info from the auth token

    const product = await Product.findById(id); 
    // const product = await Product.findByIdAndUpdate(
    //   id,
    //   { $push: { comments: { text, createdAt: new Date() } } },
    //   { new: true }
    // );
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const newComment = { text, createdAt: new Date(),
      username: user.tokenUsername, // Add username from token
     };
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
//     const productWithBase64Media = {
//       ...product._doc,
//       media: product.media.map((buffer) => buffer.toString('base64')),
//     };
//     res.json(productWithBase64Media);
//   } catch (err) {
//     console.error('Error fetching product by ID:', err);
//     res.status(500).json({ message: 'Error fetching product details' });
//   }
// });

// Get a single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const productWithBase64Media = {
      ...product._doc,
      media: product.media.map((buffer) => buffer.toString('base64')),
    };

    if (req.seller) {
      // If the user is authenticated, include likedByUser info
      const sellerId = req.seller.id;
      const seller = await Seller.findById(sellerId);
      const isLiked = seller.likedProducts?.includes(product._id.toString());
      productWithBase64Media.likedByUser = isLiked;
    }

    res.json(productWithBase64Media);
  } catch (err) {
    console.error('Error fetching product by ID:', err);
    res.status(500).json({ message: 'Error fetching product details' });
  }
});


module.exports = router;
