// seedDatabase.js
const mongoose = require("mongoose");
require("dotenv").config();

const Campus = require("./models/campus"); // adjust path if needed

// ✅ Sample campus data with coordinates (lat, lng)
const sampleData = [
  {
    location: "Library",
    signalStrength: "Strong",
    provider: "Jio",
    coordinates: { lat: 12.9102945, lng: 74.8997661 },
  },
  {
    location: "Cafeteria",
    signalStrength: "Moderate",
    provider: "Airtel",
    coordinates: { lat: 12.91088, lng: 74.90055 },
  },
  {
    location: "Auditorium",
    signalStrength: "Weak",
    provider: "VI",
    coordinates: { lat: 12.91123, lng: 74.9012 },
  },
  {
    location: "Admin Block",
    signalStrength: "Strong",
    provider: "Jio",
    coordinates: { lat: 12.9098, lng: 74.899 },
  },
];

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ Connected to MongoDB");
    await Campus.deleteMany({});
    console.log("🧹 Cleared old data");

    await Campus.insertMany(sampleData);
    console.log("🌱 Seeded database with sample campus locations");

    mongoose.connection.close();
  })
  .catch((err) => console.error("❌ Error:", err));
