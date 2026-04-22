const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const Activity = require('./models/Activity');
const PlaylistProgress = require('./models/PlaylistProgress');

// The provided URI string has the password 'Aditya@1298'. We must URL-encode the '@'.
const MONGO_URI = "REDACTED_URI";

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// API endpoint to log activity
app.post('/api/track/activity', async (req, res) => {
  try {
    console.log('Received activity track request:', req.body);
    const { videoId, title, channel, category, watchTimeSeconds, isLearning } = req.body;
    
    // Find if activity exists for today for this video
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let activity = await Activity.findOne({ 
      videoId,
      date: { $gte: today }
    });

    if (activity) {
      activity.watchTimeSeconds += watchTimeSeconds;
      await activity.save();
    } else {
      activity = new Activity({ videoId, title, channel, category, watchTimeSeconds, isLearning });
      await activity.save();
    }

    res.json({ success: true, activity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to log playlist progress
app.post('/api/track/playlist', async (req, res) => {
  try {
    console.log('Received playlist track request:', req.body);
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
    
    res.json({ success: true, playlist });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get stats
app.get('/api/stats', async (req, res) => {
  try {
    const activities = await Activity.find();
    const playlists = await PlaylistProgress.find();
    
    // Process aggregated stats for the dashboard
    let totalWatchTime = 0;
    let learningTime = 0;
    const channelStats = {};
    const categoryStats = {};

    activities.forEach(act => {
      totalWatchTime += act.watchTimeSeconds;
      if (act.isLearning) learningTime += act.watchTimeSeconds;

      if (!channelStats[act.channel]) channelStats[act.channel] = 0;
      channelStats[act.channel] += act.watchTimeSeconds;

      if (!categoryStats[act.category]) categoryStats[act.category] = 0;
      categoryStats[act.category] += act.watchTimeSeconds;
    });

    const channelData = Object.keys(channelStats).map(key => ({ name: key, value: channelStats[key] }));
    const categoryData = Object.keys(categoryStats).map(key => ({ name: key, value: categoryStats[key] }));

    res.json({ 
      activities, 
      playlists, 
      summary: { totalWatchTime, learningTime },
      channelData,
      categoryData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
