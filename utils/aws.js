// utils/aws.js (optional)
const AWS = require('aws-sdk');

// Initialize S3 with credentials
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION, // Specify region if needed
});

// Function to upload image to S3 and return the public URL
const uploadImageToCloud = async (imageBuffer) => {
    try {
        // Set unique key for the image
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME, // Ensure you have the correct bucket name
          Key: `product-images/${Date.now()}.jpg`, // Unique key using timestamp
          Body: imageBuffer, // Image buffer
          ContentType: 'image/jpeg', // Content type for the image
          ACL: 'public-read', // Make the image publicly accessible
        };
    
        // Upload the image and get the result
        const uploadResult = await s3.upload(params).promise();
    
        // Return the public URL of the uploaded image
        return uploadResult.Location;
      } catch (error) {
        console.error("Error uploading image to S3:", error);
        throw new Error("Failed to upload image to cloud");
      }
};

module.exports = { uploadImageToCloud };
