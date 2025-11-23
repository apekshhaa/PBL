const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const Location = require("./models/location");
const Campus = require("./models/campus"); // optional if using signal data

const app = express();
app.use(express.json());
app.use(cors());

// ✅ Connect directly to your MongoDB (local Compass connection)
mongoose
  .connect("mongodb://127.0.0.1:27017/mapDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB: mapDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Route: Get all locations
app.get("/api/locations", async (req, res) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Route: Get a single location by name (search)
app.get("/api/location/:place", async (req, res) => {
  try {
    const placeName = req.params.place.toLowerCase();
    const location = await Location.findOne({
      areaName: { $regex: placeName, $options: "i" },
    });
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }
    res.json(location);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Route: Add a new campus signal record (optional)
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

// ✅ Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("🌍 API Endpoint available at: http://localhost:5000/api/locations");
});
