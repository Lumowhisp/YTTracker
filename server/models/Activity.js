const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  videoId: { type: String, required: true, index: true },
  title: String,
  channel: String,
  category: { type: String, default: 'Entertainment' },
  watchTimeSeconds: { type: Number, default: 0 },
  videoDurationSeconds: { type: Number, default: 0 },
  thumbnailUrl: String,
  isLearning: { type: Boolean, default: false },
  completionPercent: { type: Number, default: 0, min: 0, max: 100 },
  date: { type: Date, default: Date.now, index: true },
  hour: { type: Number, min: 0, max: 23 },
  dayOfWeek: { type: Number, min: 0, max: 6 },
  confidence: { type: Number, default: 100 },
  needsReview: { type: Boolean, default: false }
});

// Compound index for efficient date-range + video queries
activitySchema.index({ videoId: 1, date: 1 });

module.exports = mongoose.model('Activity', activitySchema);
