console.log("YouTube Activity Tracker: Content script loaded.");

let lastTrackedTime = Date.now();

const isLearningCategory = (category, title) => {
  const learningCategories = ['Education', 'Science & Technology', 'Howto & Style'];
  if (learningCategories.includes(category)) return true;
  
  const learningKeywords = ['tutorial', 'course', 'learn', 'how to', 'guide', 'lecture'];
  const lowerTitle = title.toLowerCase();
  return learningKeywords.some(keyword => lowerTitle.includes(keyword));
};

const getCategory = () => {
  const categoryElement = document.querySelector('meta[itemprop="genre"]');
  return categoryElement ? categoryElement.content : 'Entertainment';
};

const trackWatchTime = () => {
  const video = document.querySelector('video');
  if (!video || video.paused || video.ended) {
    lastTrackedTime = Date.now();
    return;
  }

  const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') || document.querySelector('h1.title yt-formatted-string') || document.querySelector('h1.ytd-watch-metadata');
  const channelEl = document.querySelector('ytd-channel-name .yt-simple-endpoint') || document.querySelector('#text.ytd-channel-name a');
  
  if (!titleEl || !channelEl) return;

  const title = titleEl.innerText || titleEl.textContent;
  const channel = channelEl.innerText || channelEl.textContent;
  const category = getCategory();
  
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('v');
  const playlistId = urlParams.get('list');
  
  if (!videoId) return;

  const now = Date.now();
  const timeSpentSeconds = (now - lastTrackedTime) / 1000;

  if (timeSpentSeconds >= 5) {
    lastTrackedTime = now;
    console.log(`YouTube Activity Tracker: Logged ${Math.floor(timeSpentSeconds)}s of "${title}"`);

    try {
      chrome.runtime.sendMessage({
        type: 'TRACK_ACTIVITY',
        data: {
          videoId,
          title,
          channel,
          category,
          watchTimeSeconds: Math.floor(timeSpentSeconds),
          isLearning: isLearningCategory(category, title)
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("YouTube Activity Tracker Error:", chrome.runtime.lastError);
        }
      });
    } catch(err) {}
  }

  if (playlistId) {
    const playlistPanel = document.querySelector('ytd-playlist-panel-renderer');
    if (playlistPanel) {
      const topicEl = playlistPanel.querySelector('.title.ytd-playlist-panel-renderer');
      const topic = topicEl ? topicEl.innerText : 'Unknown Playlist';
      
      const statsEl = playlistPanel.querySelector('.publisher-info-and-stats.ytd-playlist-panel-renderer span');
      if (statsEl) {
        const text = statsEl.innerText;
        const parts = text.split('/');
        if (parts.length === 2) {
          const watchedVideos = parseInt(parts[0].trim());
          const totalVideos = parseInt(parts[1].trim());
          try {
            chrome.runtime.sendMessage({
              type: 'TRACK_PLAYLIST',
              data: {
                playlistId,
                topic,
                watchedVideos,
                totalVideos
              }
            });
          } catch(e) {}
        }
      }
    }
  }
};

// Check every 5 seconds, more reliable than play/pause events on YouTube
setInterval(() => {
  if (document.visibilityState === 'visible') {
    trackWatchTime();
  } else {
    lastTrackedTime = Date.now();
  }
}, 5000);
