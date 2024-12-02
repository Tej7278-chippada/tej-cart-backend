// /controllers/offers.js
const Offer = require("../models/Offer");

// Get all offers
exports.getOffers = async (req, res) => {
  try {
    const offers = await Offer.find();
    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch offers" });
  }
};

// Add an offer
exports.addOffer = async (req, res) => {
  try {
    const { title, image } = req.body;
    const offer = new Offer({ title, image });
    await offer.save();
    res.status(201).json(offer);
  } catch (error) {
    res.status(500).json({ error: "Failed to add offer" });
  }
};

// Update an offer
exports.updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedOffer = await Offer.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json(updatedOffer);
  } catch (error) {
    res.status(500).json({ error: "Failed to update offer" });
  }
};

// Delete an offer
exports.deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    await Offer.findByIdAndDelete(id);
    res.status(200).json({ message: "Offer deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete offer" });
  }
};
