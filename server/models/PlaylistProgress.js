const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  playlistId: String,
  topic: String,
  totalVideos: Number,
  watchedVideos: Number,
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PlaylistProgress', playlistSchema);
