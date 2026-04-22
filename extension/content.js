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

const trackWatchTime = (forceSend = false) => {
  const video = document.querySelector('video');
  if (!video || video.paused || video.ended) {
    lastTrackedTime = Date.now();
    return;
  }

  const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title yt-formatted-string');
  const title = titleEl ? (titleEl.innerText || titleEl.textContent) : document.title.replace(' - YouTube', '');
  
  const getChannelName = () => {
    const el = document.querySelector('#owner ytd-channel-name a') || 
               document.querySelector('ytd-video-owner-renderer ytd-channel-name a') || 
               document.querySelector('#upload-info ytd-channel-name a');
    return el ? (el.innerText || el.textContent).trim() : 'Unknown Channel';
  };
  const channel = getChannelName();
  const category = getCategory();
  
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('v');
  const playlistId = urlParams.get('list');
  
  if (!videoId) return;

  const now = Date.now();
  const timeSpentSeconds = (now - lastTrackedTime) / 1000;

  // Accumulate time in 30-second chunks to avoid spamming the backend
  if (timeSpentSeconds >= 30 || (forceSend && timeSpentSeconds >= 2)) {
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

// Check every 5 seconds to ensure accuracy, but we only send data every 30s
setInterval(() => {
  if (document.visibilityState === 'visible') {
    trackWatchTime();
  } else {
    lastTrackedTime = Date.now();
  }
}, 5000);

// Flush any remaining accumulated time when the user closes the tab or navigates away
window.addEventListener('beforeunload', () => {
  trackWatchTime(true); 
});
