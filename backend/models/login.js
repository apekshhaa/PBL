const mongoose = require('mongoose');

const LoginSchema = new mongoose.Schema({
  mode: { type: String, enum: ['student', 'visitor'], required: true },
  identifier: { type: String, required: true },
  time: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Login', LoginSchema);
