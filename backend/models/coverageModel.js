const mongoose = require('mongoose');

const coverageSchema = new mongoose.Schema({
  areaName: { type: String, required: true },
  network: { type: String, required: true },   // e.g. "Jio", "Airtel", etc.
  strength: { type: Number, required: true },  // e.g. 1–5
  coordinates: {
    lat: Number,
    lng: Number
  }
});

module.exports = mongoose.model('Coverage', coverageSchema);
