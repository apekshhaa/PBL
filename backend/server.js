const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Campus = require('./models/campus');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Default route
app.get('/', (req, res) => {
  res.send('Backend is running successfully!');
});

// GET all campus data
app.get('/api/campus', async (req, res) => {
  try {
    const data = await Campus.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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
