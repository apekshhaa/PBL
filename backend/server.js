const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Location = require("./models/location")
const Campus = require("./models/campus"); // optional if using signal data

const app = express();
app.use(express.json());
app.use(cors());

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/nodeDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ✅ Fetch all locations for map
app.get("/api/locations", async (req, res) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Fetch a single location by name (for search)
app.get("/api/location/:place", async (req, res) => {
  try {
    const placeName = req.params.place.toLowerCase();
    const location = await Location.findOne({
      name: { $regex: placeName, $options: "i" },
    });
    if (!location)
      return res.status(404).json({ message: "Location not found" });
    res.json(location);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Optional: Add new campus data
app.post("/api/campus", async (req, res) => {
  const { location, signalStrength, provider } = req.body;
  try {
    const newEntry = new Campus({ location, signalStrength, provider });
    const saved = await newEntry.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
