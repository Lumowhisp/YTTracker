const mongoose = require('mongoose');

const customTaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  durationSeconds: { type: Number, required: true },
  date: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('CustomTask', customTaskSchema);
