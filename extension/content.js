/**
 * YouTube Activity Tracker — Content Script
 * Runs on every YouTube page. Handles SPA navigation, video tracking,
 * search query capture, and rich metadata extraction.
 */
(() => {
  const LOG_PREFIX = '[YT-Tracker]';
  let currentVideoId = null;
  let lastSendTime = Date.now();
  let trackingInterval = null;
  
  // Nudge tracking
  let continuousEntertainmentSeconds = 0;
  let nudgeShown = false;

  // ─── Robust Metadata & Categorization Engine ─────────────────────────────

  const LEARNING_CATEGORIES = ['Education', 'Science & Technology', 'Howto & Style'];
  
  // 1. Channel Whitelist: Known educational/productivity creators that get misclassified as Entertainment/Blogs
  const EDU_CHANNELS = [
    'veritasium', 'kurzgesagt', 'huberman lab', 'lex fridman', 'ali abdaal', 
    'fireship', 'harkirat singh', 'freecodecamp', 'mit opencourseware', 
    'crashcourse', 'thomas frank', 'matt d\'avella', 'marques brownlee',
    'mrwhosetheboss', 'tom scott', 'mark rober', 'clever programmer',
    'the cherno', 'neeta', 'code with harry', 'striver'
  ];

  // 2. Positive Keywords (Broadened)
  const LEARNING_KEYWORDS = [
    // Tech / Coding
    'tutorial', 'course', 'learn', 'guide', 'lecture', 'explained',
    'lesson', 'bootcamp', 'masterclass', 'crash course', 'walkthrough',
    'fundamentals', 'beginner', 'programming', 'coding', 'developer',
    'dsa', 'algorithm', 'system design', 'interview prep', 'javascript', 
    'python', 'react', 'nextjs', 'backend', 'frontend', 'fullstack',
    // Productivity / Growth
    'productivity', 'habit', 'focus', 'motivation', 'discipline', 
    'study with me', 'how i study', 'my routine', 'time management',
    // Finance / Business
    'investing', 'finance', 'business', 'startup', 'marketing', 'economy'
  ];

  // 3. Negative Keywords (Overrides positive matches if it's actually entertainment)
  const NEGATIVE_KEYWORDS = [
    'prank', 'reaction', 'funny', 'meme', 'gameplay', 'montage', 'highlights',
    'fails', 'try not to laugh', 'challenge', 'unboxing', 'vlog', 'gossip'
  ];

  function getVideoDescription() {
    const el = document.querySelector('meta[name="description"]');
    return el ? el.content : '';
  }

  function isLearningContent(category, title, channel) {
    const lowerTitle = (title || '').toLowerCase();
    const lowerChannel = (channel || '').toLowerCase();
    const lowerDesc = getVideoDescription().toLowerCase();

    // Fast-fail: If it has strong entertainment keywords, mark as non-learning immediately
    if (NEGATIVE_KEYWORDS.some(kw => lowerTitle.includes(kw))) return false;

    // Rule 1: Channel Whitelist (Highest accuracy)
    if (EDU_CHANNELS.some(c => lowerChannel.includes(c))) return true;

    // Rule 2: Official YouTube Category
    if (LEARNING_CATEGORIES.includes(category)) return true;

    // Rule 3: Title Keyword Match
    if (LEARNING_KEYWORDS.some(kw => lowerTitle.includes(kw))) return true;

    // Rule 4: Description Keyword Match (Often creators put "In this tutorial..." in desc)
    if (LEARNING_KEYWORDS.some(kw => lowerDesc.includes(kw))) return true;

    return false;
  }

  function getCategory() {
    const el = document.querySelector('meta[itemprop="genre"]');
    return el ? el.content : 'Entertainment';
  }

  function getVideoTitle() {
    const el = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
               document.querySelector('h1.title yt-formatted-string');
    if (el) return (el.innerText || el.textContent).trim();
    return document.title.replace(' - YouTube', '').trim();
  }

  function getChannelName() {
    const el = document.querySelector('#owner ytd-channel-name a') ||
               document.querySelector('ytd-video-owner-renderer ytd-channel-name a') ||
               document.querySelector('#upload-info ytd-channel-name a');
    return el ? (el.innerText || el.textContent).trim() : 'Unknown Channel';
  }

  function getVideoId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('v');
  }

  function getPlaylistId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('list');
  }

  function getSearchQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get('search_query');
  }

  function getPageType() {
    const path = window.location.pathname;
    if (path.startsWith('/watch')) return 'watch';
    if (path.startsWith('/results')) return 'search';
    if (path.startsWith('/shorts')) return 'shorts';
    if (path === '/' || path === '/feed/subscriptions' || path === '/feed/trending') return 'browse';
    if (path.startsWith('/@') || path.startsWith('/channel') || path.startsWith('/c/')) return 'channel';
    return 'other';
  }

  // ─── Video Tracking ───────────────────────────────────────────────────────

  function sendActivityData(forceSend = false) {
    const video = document.querySelector('video');
    if (!video || video.paused || video.ended) {
      lastSendTime = Date.now();
      return;
    }

    const videoId = getVideoId();
    if (!videoId) return;

    const now = Date.now();
    const elapsed = (now - lastSendTime) / 1000;

    // Send every 30 seconds, or on force (min 2s to avoid noise)
    if (elapsed >= 30 || (forceSend && elapsed >= 2)) {
      lastSendTime = now;

      const title = getVideoTitle();
      const channel = getChannelName();
      const category = getCategory();
      const duration = video.duration || 0;
      const currentTime = video.currentTime || 0;
      const completionPercent = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;

      const isLearning = isLearningContent(category, title, channel);

      const data = {
        videoId,
        title,
        channel,
        category,
        watchTimeSeconds: Math.floor(elapsed),
        isLearning,
        videoDurationSeconds: Math.round(duration),
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        completionPercent: Math.min(completionPercent, 100)
      };

      console.log(`${LOG_PREFIX} Logging ${Math.floor(elapsed)}s on "${title}"`);

      // ─── Nudge System ───
      if (!isLearning) {
        continuousEntertainmentSeconds += elapsed;
        // Trigger nudge after 15 minutes (900 seconds) of continuous entertainment
        if (continuousEntertainmentSeconds >= 900 && !nudgeShown) {
          showNudgeOverlay();
          nudgeShown = true;
        }
      } else {
        continuousEntertainmentSeconds = 0;
        nudgeShown = false;
        hideNudgeOverlay();
      }

      try {
        chrome.runtime.sendMessage({ type: 'TRACK_ACTIVITY', data });
      } catch (e) {
        // Extension context invalidated, ignore
      }
    }
  }

  // ─── Nudge UI Overlay ───────────────────────────────────────────────────

  function showNudgeOverlay() {
    if (document.getElementById('yt-tracker-nudge')) return;
    
    const nudge = document.createElement('div');
    nudge.id = 'yt-tracker-nudge';
    nudge.innerHTML = `
      <div style="
        position: fixed; top: 80px; right: 24px; z-index: 999999;
        background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(16px);
        border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px;
        padding: 16px 20px; width: 320px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        color: white; font-family: 'Inter', sans-serif;
        transform: translateX(120%); transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      ">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(236, 72, 153, 0.2); display: flex; align-items: center; justify-content: center; font-size: 16px;">⏱️</div>
          <div style="font-weight: 600; font-size: 15px; color: #f1f5f9;">Time Check</div>
        </div>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 12px;">
          You've been watching entertainment for 15 minutes. Time to switch to something educational?
        </p>
        <div style="display: flex; gap: 8px;">
          <button id="nudge-close" style="
            flex: 1; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);
            background: transparent; color: white; cursor: pointer; font-size: 13px; transition: 0.2s;
          ">Dismiss</button>
          <button id="nudge-learn" style="
            flex: 1; padding: 8px; border-radius: 6px; border: none;
            background: linear-gradient(135deg, #8b5cf6, #ec4899); color: white; cursor: pointer; font-size: 13px; transition: 0.2s; font-weight: 500;
          ">Find a Course</button>
        </div>
      </div>
    `;
    document.body.appendChild(nudge);

    // Animate in
    setTimeout(() => {
      nudge.firstElementChild.style.transform = 'translateX(0)';
    }, 100);

    document.getElementById('nudge-close').onclick = () => {
      nudge.firstElementChild.style.transform = 'translateX(120%)';
      setTimeout(() => hideNudgeOverlay(), 500);
    };

    document.getElementById('nudge-learn').onclick = () => {
      window.location.href = 'https://www.youtube.com/results?search_query=programming+course';
    };
  }

  function hideNudgeOverlay() {
    const nudge = document.getElementById('yt-tracker-nudge');
    if (nudge) nudge.remove();
  }

  // ─── Playlist Tracking ────────────────────────────────────────────────────

  function trackPlaylist() {
    const playlistId = getPlaylistId();
    if (!playlistId) return;

    const panel = document.querySelector('ytd-playlist-panel-renderer');
    if (!panel) return;

    const topicEl = panel.querySelector('.title.ytd-playlist-panel-renderer');
    const topic = topicEl ? topicEl.innerText.trim() : 'Unknown Playlist';

    const items = panel.querySelectorAll('ytd-playlist-panel-video-renderer');
    const totalVideos = items.length;

    // Count videos with the "watched" indicator
    let watchedVideos = 0;
    const statsEl = panel.querySelector('#publisher-container span');
    if (statsEl) {
      const text = statsEl.innerText;
      const parts = text.split('/');
      if (parts.length === 2) {
        watchedVideos = parseInt(parts[0].trim()) || 0;
      }
    }

    if (totalVideos > 0) {
      try {
        chrome.runtime.sendMessage({
          type: 'TRACK_PLAYLIST',
          data: { playlistId, topic, watchedVideos, totalVideos }
        });
      } catch (e) {}
    }
  }

  // ─── Search Tracking ──────────────────────────────────────────────────────

  let lastTrackedSearch = '';

  function trackSearch() {
    if (getPageType() !== 'search') return;
    const query = getSearchQuery();
    if (!query || query === lastTrackedSearch) return;
    lastTrackedSearch = query;

    console.log(`${LOG_PREFIX} Search: "${query}"`);
    try {
      chrome.runtime.sendMessage({ type: 'TRACK_SEARCH', data: { query } });
    } catch (e) {}
  }

  // ─── Zen Mode (Shorts & Distraction Blocker) ─────────────────────────────

  let zenModeEnabled = false;

  function applyZenMode() {
    if (!zenModeEnabled) {
      const style = document.getElementById('zen-mode-style');
      if (style) style.remove();
      return;
    }

    // Redirect away from Shorts
    if (getPageType() === 'shorts') {
      window.location.href = 'https://www.youtube.com/';
      return;
    }

    // Inject CSS to hide Shorts and distractions
    if (!document.getElementById('zen-mode-style')) {
      const style = document.createElement('style');
      style.id = 'zen-mode-style';
      style.textContent = `
        /* Hide Shorts in sidebar */
        ytd-guide-entry-renderer a[title="Shorts"],
        ytd-mini-guide-entry-renderer[aria-label="Shorts"] { display: none !important; }
        
        /* Hide Shorts shelves on homepage */
        ytd-rich-shelf-renderer[is-shorts],
        ytd-reel-shelf-renderer { display: none !important; }
        
        /* Hide Shorts tab on channel pages */
        tp-yt-paper-tab:has(div.tab-title:contains("Shorts")) { display: none !important; }
      `;
      document.head.appendChild(style);
    }
  }

  // Load initial Zen Mode state
  try {
    chrome.storage.local.get(['zenMode'], (result) => {
      zenModeEnabled = !!result.zenMode;
      applyZenMode();
    });

    // Listen for toggle changes from the popup
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.zenMode !== undefined) {
        zenModeEnabled = changes.zenMode.newValue;
        applyZenMode();
      }
    });
  } catch (e) {}

  // ─── Navigation Handler (SPA) ─────────────────────────────────────────────

  function onNavigate() {
    applyZenMode();
    
    const newVideoId = getVideoId();

    // If we were watching a video, flush remaining time
    if (currentVideoId && currentVideoId !== newVideoId) {
      sendActivityData(true);
    }

    currentVideoId = newVideoId;
    lastSendTime = Date.now();

    // Track search queries
    trackSearch();
  }

  // Listen for YouTube SPA navigation events
  document.addEventListener('yt-navigate-finish', onNavigate);
  window.addEventListener('popstate', onNavigate);

  // ─── Polling Loop ─────────────────────────────────────────────────────────

  function startTracking() {
    if (trackingInterval) clearInterval(trackingInterval);

    trackingInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        sendActivityData();
        trackPlaylist();
      } else {
        // Tab hidden — reset timer so we don't count background time
        lastSendTime = Date.now();
      }
    }, 5000);
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  window.addEventListener('beforeunload', () => {
    sendActivityData(true);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      sendActivityData(true);
    } else {
      lastSendTime = Date.now();
    }
  });

  // ─── Init ─────────────────────────────────────────────────────────────────

  console.log(`${LOG_PREFIX} Content script loaded on ${getPageType()} page`);
  currentVideoId = getVideoId();
  trackSearch();
  startTracking();
})();
