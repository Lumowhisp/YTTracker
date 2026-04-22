const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  videoId: String,
  title: String,
  channel: String,
  category: String,
  watchTimeSeconds: Number,
  isLearning: Boolean,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Activity', activitySchema);
