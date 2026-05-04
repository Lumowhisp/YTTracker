const mongoose = require('mongoose');

const webActivitySchema = new mongoose.Schema({
  domain: { type: String, required: true, index: true },
  url: String,
  title: String,
  category: { 
    type: String, 
    enum: ['Productive', 'Social Media', 'Entertainment', 'Shopping', 'News', 'Communication', 'Other'],
    default: 'Other' 
  },
  activeSeconds: { type: Number, default: 0 },
  date: { type: Date, default: Date.now, index: true },
  hour: { type: Number, min: 0, max: 23 },
  dayOfWeek: { type: Number, min: 0, max: 6 }
});

webActivitySchema.index({ domain: 1, date: 1 });

module.exports = mongoose.model('WebActivity', webActivitySchema);
