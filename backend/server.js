const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

const Location = mongoose.model("Location", new mongoose.Schema({
  name: String,
  lat: Number,
  lng: Number,
}), "locations");

app.get("/api/location/:place", async (req, res) => {
  try {
    const placeName = req.params.place.toLowerCase();
    const location = await Location.findOne({ name: { $regex: placeName, $options: "i" } });
    if (!location) return res.status(404).json({ message: "Location not found" });
    res.json(location);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));

// POST new campus data (optional)
app.post('/api/campus', async (req, res) => {
  const { location, signalStrength, provider } = req.body;

  const newEntry = new Campus({
    location,
    signalStrength,
    provider
  });

  try {
    const saved = await newEntry.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
