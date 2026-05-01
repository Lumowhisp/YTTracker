const mongoose = require('mongoose');

const searchQuerySchema = new mongoose.Schema({
  query: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('SearchQuery', searchQuerySchema);
