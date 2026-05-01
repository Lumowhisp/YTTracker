const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  dailyLimitMinutes: { type: Number, default: 120 },
  learningGoalMinutes: { type: Number, default: 60 },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Goal', goalSchema);
