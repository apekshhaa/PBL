// backend/models/location.js
const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  areaName: { type: String, required: true }, // match your DB field exactly
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
});

module.exports = mongoose.model("Location", locationSchema, "location");
//                ^ model name     ^ schema      ^ exact collection name
