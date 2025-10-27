const mongoose = require('mongoose');

const campusSchema = new mongoose.Schema({
  location: String,
  signalStrength: String,
  provider: String
}, { collection: 'campus' }); // 👈 Use your existing collection

module.exports = mongoose.model('Campus', campusSchema);
