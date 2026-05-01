require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Activity = require('./models/Activity');
const PlaylistProgress = require('./models/PlaylistProgress');
const SearchQuery = require('./models/SearchQuery');
const Goal = require('./models/Goal');

const app = express();
app.use(cors());
app.use(express.json());

// Root health check
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family:sans-serif; text-align:center; padding-top:100px;">
      <h1 style="color:#FF0000;">🚀 YouTube Tracker API is Live</h1>
      <p style="color:#666;">Version 2.0.0 (Premium UI Update)</p>
      <p>Endpoints are available at <code>/api/*</code></p>
    </div>
  `);
});

// ─── ML Classifier ───────────────────────────────────────────────────────────
const { initializeModel, classifyVideo } = require('./ml/classifier');
initializeModel();

// ─── Database ────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getDateRange(range) {
  const now = new Date();
  const start = new Date();
  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case '7d':
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case '30d':
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      return null; // all time
  }
  return start;
}

function calculateProductivityScore(totalSeconds, learningSeconds, avgCompletion, videosCount) {
  if (totalSeconds === 0) return 0;
  let score = 40;
  // Learning ratio (0-35 pts)
  const learningRatio = learningSeconds / Math.max(totalSeconds, 1);
  score += learningRatio * 35;
  // Completion bonus (0-15 pts)
  score += (avgCompletion / 100) * 15;
  // Moderate usage bonus (0-10 pts)
  const hours = totalSeconds / 3600;
  if (hours <= 2) score += 10;
  else if (hours <= 4) score += 5;
  else score -= 5;
  return Math.min(100, Math.max(0, Math.round(score)));
}

// ─── TRACKING ENDPOINTS ─────────────────────────────────────────────────────

// Log video watch activity
app.post('/api/track/activity', async (req, res) => {
  try {
    const { videoId, title, channel, category, watchTimeSeconds, isLearning: clientIsLearning,
            videoDurationSeconds, thumbnailUrl, completionPercent } = req.body;
    if (!videoId) return res.status(400).json({ error: 'videoId required' });

    // --- ML Classification Override ---
    let isLearning = clientIsLearning;
    let confidence = 100;
    let needsReview = false;
    
    const { classifyVideo } = require('./ml/classifier');
    const mlPrediction = classifyVideo(title, category);
    
    console.log(`📥 Received tracking for: "${title}" | Channel: "${channel}"`);
    
    if (mlPrediction) {
      isLearning = mlPrediction.isLearning;
      const totalScore = mlPrediction.raw.reduce((acc, curr) => acc + curr.value, 0);
      confidence = totalScore > 0 ? (mlPrediction.confidence / totalScore) * 100 : 50;
      needsReview = confidence < 75; // If model is unsure, flag it for user review
      
      console.log(`🧠 ML Classification: "${title}" -> ${isLearning ? 'Learning' : 'Entertainment'} (${Math.round(confidence)}% confidence)`);
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    let activity = await Activity.findOne({ videoId, date: { $gte: today } });

    if (activity) {
      activity.watchTimeSeconds += watchTimeSeconds;
      if (videoDurationSeconds) activity.videoDurationSeconds = videoDurationSeconds;
      if (completionPercent) activity.completionPercent = Math.max(activity.completionPercent, completionPercent);
      if (thumbnailUrl) activity.thumbnailUrl = thumbnailUrl;
      await activity.save();
    } else {
      activity = new Activity({
        videoId, title, channel, category, watchTimeSeconds, isLearning,
        videoDurationSeconds: videoDurationSeconds || 0,
        thumbnailUrl: thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        completionPercent: completionPercent || 0,
        date: now,
        hour: now.getHours(),
        dayOfWeek: now.getDay(),
        confidence,
        needsReview
      });
      await activity.save();
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Track activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Log playlist progress
app.post('/api/track/playlist', async (req, res) => {
  try {
    const { playlistId, topic, totalVideos, watchedVideos } = req.body;
    let playlist = await PlaylistProgress.findOne({ playlistId });
    if (playlist) {
      playlist.watchedVideos = Math.max(playlist.watchedVideos, watchedVideos);
      playlist.lastUpdated = Date.now();
      await playlist.save();
    } else {
      playlist = new PlaylistProgress({ playlistId, topic, totalVideos, watchedVideos });
      await playlist.save();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log search query
app.post('/api/track/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });
    await new SearchQuery({ query }).save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Feedback Loop for ML Classifier
app.post('/api/track/feedback', async (req, res) => {
  try {
    const { videoId, isLearning, title, category } = req.body;
    
    // Update db
    await Activity.updateMany(
      { videoId },
      { $set: { isLearning, needsReview: false, confidence: 100 } }
    );
    
    // Retrain model
    const { addFeedback } = require('./ml/classifier');
    addFeedback(title, category || 'unknown', isLearning);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── STATS ENDPOINTS ────────────────────────────────────────────────────────

// Overview stats with date range
app.get('/api/stats/overview', async (req, res) => {
  try {
    const startDate = getDateRange(req.query.range);
    const match = startDate ? { date: { $gte: startDate } } : {};

    const activities = await Activity.find(match);
    const playlists = await PlaylistProgress.find();
    const goal = await Goal.findOne().sort({ updatedAt: -1 });

    let totalWatchTime = 0;
    let learningTime = 0;
    let totalCompletion = 0;
    let completionCount = 0;
    const channelSet = new Set();

    activities.forEach(act => {
      totalWatchTime += act.watchTimeSeconds;
      if (act.isLearning) learningTime += act.watchTimeSeconds;
      if (act.completionPercent > 0) {
        totalCompletion += act.completionPercent;
        completionCount++;
      }
      channelSet.add(act.channel);
    });

    const avgCompletion = completionCount > 0 ? totalCompletion / completionCount : 0;
    const productivityScore = calculateProductivityScore(totalWatchTime, learningTime, avgCompletion, activities.length);

    res.json({
      summary: {
        totalWatchTime,
        learningTime,
        entertainmentTime: totalWatchTime - learningTime,
        videosWatched: activities.length,
        channelsWatched: channelSet.size,
        avgCompletion: Math.round(avgCompletion),
        productivityScore
      },
      goal: goal ? { dailyLimitMinutes: goal.dailyLimitMinutes, learningGoalMinutes: goal.learningGoalMinutes } : { dailyLimitMinutes: 120, learningGoalMinutes: 60 },
      playlistCount: playlists.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Daily trends (last N days)
app.get('/api/stats/trends', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 14;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const trends = await Activity.aggregate([
      { $match: { date: { $gte: startDate } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        totalSeconds: { $sum: '$watchTimeSeconds' },
        learningSeconds: { $sum: { $cond: ['$isLearning', '$watchTimeSeconds', 0] } },
        videos: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Fill missing days with zeros
    const result = [];
    const current = new Date(startDate);
    const today = new Date();
    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0];
      const found = trends.find(t => t._id === dateStr);
      result.push({
        date: dateStr,
        label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalMinutes: found ? Math.round(found.totalSeconds / 60) : 0,
        learningMinutes: found ? Math.round(found.learningSeconds / 60) : 0,
        videos: found ? found.videos : 0
      });
      current.setDate(current.getDate() + 1);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Heatmap data (hour x dayOfWeek)
app.get('/api/stats/heatmap', async (req, res) => {
  try {
    const startDate = getDateRange(req.query.range || '30d');
    const match = startDate ? { date: { $gte: startDate } } : {};

    const data = await Activity.aggregate([
      { $match: { ...match, hour: { $exists: true }, dayOfWeek: { $exists: true } } },
      { $group: {
        _id: { hour: '$hour', day: '$dayOfWeek' },
        minutes: { $sum: { $divide: ['$watchTimeSeconds', 60] } }
      }}
    ]);

    // Build 7x24 matrix
    const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
    data.forEach(d => {
      if (d._id.day >= 0 && d._id.day < 7 && d._id.hour >= 0 && d._id.hour < 24) {
        matrix[d._id.day][d._id.hour] = Math.round(d.minutes);
      }
    });
    res.json(matrix);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Top channels
app.get('/api/stats/channels', async (req, res) => {
  try {
    const startDate = getDateRange(req.query.range);
    const match = startDate ? { date: { $gte: startDate } } : {};

    const channels = await Activity.aggregate([
      { $match: match },
      { $group: { _id: '$channel', totalSeconds: { $sum: '$watchTimeSeconds' }, videos: { $sum: 1 } } },
      { $sort: { totalSeconds: -1 } },
      { $limit: 10 }
    ]);
    res.json(channels.map(c => ({ name: c._id, minutes: Math.round(c.totalSeconds / 60), videos: c.videos })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Category breakdown
app.get('/api/stats/categories', async (req, res) => {
  try {
    const startDate = getDateRange(req.query.range);
    const match = startDate ? { date: { $gte: startDate } } : {};

    const categories = await Activity.aggregate([
      { $match: match },
      { $group: { _id: '$category', totalSeconds: { $sum: '$watchTimeSeconds' }, videos: { $sum: 1 } } },
      { $sort: { totalSeconds: -1 } }
    ]);
    res.json(categories.map(c => ({ name: c._id || 'Unknown', minutes: Math.round(c.totalSeconds / 60), videos: c.videos })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recent videos
app.get('/api/stats/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const activities = await Activity.find()
      .sort({ date: -1 })
      .limit(limit)
      .select('videoId title channel category watchTimeSeconds thumbnailUrl isLearning completionPercent date needsReview confidence');
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search history
app.get('/api/stats/searches', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const searches = await SearchQuery.find().sort({ timestamp: -1 }).limit(limit);
    res.json(searches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Playlist progress
app.get('/api/stats/playlists', async (req, res) => {
  try {
    const playlists = await PlaylistProgress.find().sort({ lastUpdated: -1 });
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GOALS ───────────────────────────────────────────────────────────────────
app.get('/api/goals', async (req, res) => {
  try {
    let goal = await Goal.findOne().sort({ updatedAt: -1 });
    if (!goal) goal = { dailyLimitMinutes: 120, learningGoalMinutes: 60 };
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/goals', async (req, res) => {
  try {
    const { dailyLimitMinutes, learningGoalMinutes } = req.body;
    let goal = await Goal.findOne();
    if (goal) {
      goal.dailyLimitMinutes = dailyLimitMinutes;
      goal.learningGoalMinutes = learningGoalMinutes;
      goal.updatedAt = Date.now();
      await goal.save();
    } else {
      goal = await new Goal({ dailyLimitMinutes, learningGoalMinutes }).save();
    }
    res.json({ success: true, goal });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── BACKWARD COMPAT ─────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const activities = await Activity.find();
    const playlists = await PlaylistProgress.find();
    let totalWatchTime = 0, learningTime = 0;
    const channelStats = {}, categoryStats = {};
    activities.forEach(act => {
      totalWatchTime += act.watchTimeSeconds;
      if (act.isLearning) learningTime += act.watchTimeSeconds;
      channelStats[act.channel] = (channelStats[act.channel] || 0) + act.watchTimeSeconds;
      categoryStats[act.category] = (categoryStats[act.category] || 0) + act.watchTimeSeconds;
    });
    res.json({
      activities, playlists,
      summary: { totalWatchTime, learningTime },
      channelData: Object.entries(channelStats).map(([name, value]) => ({ name, value })),
      categoryData: Object.entries(categoryStats).map(([name, value]) => ({ name, value }))
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/stats/daily', async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const activities = await Activity.find({ date: { $gte: today } });
    let totalWatchTime = 0, learningTime = 0;
    const channelStats = {}, categoryStats = {};
    activities.forEach(act => {
      totalWatchTime += act.watchTimeSeconds;
      if (act.isLearning) learningTime += act.watchTimeSeconds;
      channelStats[act.channel] = (channelStats[act.channel] || 0) + act.watchTimeSeconds;
      categoryStats[act.category] = (categoryStats[act.category] || 0) + act.watchTimeSeconds;
    });
    res.json({
      activities,
      summary: { totalWatchTime, learningTime },
      channelData: Object.entries(channelStats).map(([name, value]) => ({ name, value })),
      categoryData: Object.entries(categoryStats).map(([name, value]) => ({ name, value }))
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ─── START ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
