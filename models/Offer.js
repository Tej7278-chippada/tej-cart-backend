const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema({
  title: { type: String, required: true },
  image: { type: String, required: true }, // Base64 string
});

module.exports = mongoose.model("Offer", OfferSchema);
