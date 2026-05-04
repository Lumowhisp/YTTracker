/**
 * Activity Tracker — Background Service Worker
 * Handles YouTube API communication, daily reports, AND full web activity monitoring.
 */
const API_URL = 'http://localhost:3001/api/track';

// ─── Domain Categorization Engine ───────────────────────────────────────────

const DOMAIN_CATEGORIES = {
  'Productive': [
    'github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com',
    'docs.google.com', 'notion.so', 'trello.com', 'jira.atlassian.com',
    'figma.com', 'codepen.io', 'replit.com', 'codesandbox.io',
    'leetcode.com', 'hackerrank.com', 'codeforces.com', 'geeksforgeeks.org',
    'medium.com', 'dev.to', 'hashnode.dev', 'freecodecamp.org',
    'coursera.org', 'udemy.com', 'edx.org', 'khanacademy.org',
    'w3schools.com', 'mdn.io', 'developer.mozilla.org',
    'chat.openai.com', 'claude.ai', 'gemini.google.com',
    'vercel.com', 'netlify.app', 'render.com', 'railway.app',
    'npmjs.com', 'pypi.org', 'docs.python.org',
    'drive.google.com', 'calendar.google.com', 'sheets.google.com',
    'linear.app', 'asana.com', 'clickup.com', 'monday.com'
  ],
  'Social Media': [
    'twitter.com', 'x.com', 'facebook.com', 'instagram.com',
    'linkedin.com', 'reddit.com', 'threads.net', 'tumblr.com',
    'snapchat.com', 'tiktok.com', 'pinterest.com', 'quora.com',
    'discord.com', 'mastodon.social'
  ],
  'Entertainment': [
    'youtube.com', 'netflix.com', 'twitch.tv', 'primevideo.com',
    'disneyplus.com', 'hotstar.com', 'hulu.com', 'crunchyroll.com',
    'spotify.com', 'music.youtube.com', 'soundcloud.com',
    'store.steampowered.com', 'epicgames.com', '9gag.com', 'imgur.com'
  ],
  'Shopping': [
    'amazon.com', 'amazon.in', 'flipkart.com', 'myntra.com',
    'ebay.com', 'aliexpress.com', 'etsy.com', 'shopify.com',
    'meesho.com', 'ajio.com', 'nykaa.com', 'swiggy.com', 'zomato.com'
  ],
  'News': [
    'news.google.com', 'bbc.com', 'cnn.com', 'reuters.com',
    'theguardian.com', 'nytimes.com', 'timesofindia.indiatimes.com',
    'ndtv.com', 'thehindu.com', 'moneycontrol.com', 'livemint.com',
    'techcrunch.com', 'theverge.com', 'wired.com', 'arstechnica.com'
  ],
  'Communication': [
    'mail.google.com', 'outlook.com', 'outlook.live.com',
    'web.whatsapp.com', 'web.telegram.org', 'slack.com',
    'teams.microsoft.com', 'meet.google.com', 'zoom.us'
  ]
};

function categorizeDomain(domain) {
  const clean = domain.replace(/^www\./, '');
  for (const [category, domains] of Object.entries(DOMAIN_CATEGORIES)) {
    if (domains.some(d => clean === d || clean.endsWith('.' + d))) {
      return category;
    }
  }
  return 'Other';
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// ─── Web Activity Tracker ───────────────────────────────────────────────────

let webTrackingEnabled = true;
let activeTabInfo = { tabId: null, domain: null, url: null, title: '', startTime: Date.now() };

function flushActiveTime() {
  if (!webTrackingEnabled) return;
  if (!activeTabInfo.domain) return;
  
  const elapsed = Math.round((Date.now() - activeTabInfo.startTime) / 1000);
  
  // Only send if at least 2 seconds have elapsed (avoid noise)
  if (elapsed >= 2) {
    postToServer('/web-activity', {
      domain: activeTabInfo.domain,
      url: activeTabInfo.url,
      title: activeTabInfo.title,
      category: categorizeDomain(activeTabInfo.domain),
      activeSeconds: elapsed
    });
  }
}

function updateActiveTab(tabId) {
  // Flush time for the previous tab
  flushActiveTime();
  
  // Start tracking the new tab
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab?.url) {
      activeTabInfo = { tabId: null, domain: null, url: null, title: '', startTime: Date.now() };
      return;
    }
    
    const domain = extractDomain(tab.url);
    activeTabInfo = {
      tabId: tab.id,
      domain,
      url: tab.url,
      title: tab.title || '',
      startTime: Date.now()
    };
  });
}

// Track tab switches
chrome.tabs.onActivated.addListener(({ tabId }) => {
  updateActiveTab(tabId);
});

// Track URL changes within the same tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tabId === activeTabInfo.tabId) {
    updateActiveTab(tabId);
  }
});

// Track window focus changes (user switching apps)
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus — flush and pause
    flushActiveTime();
    activeTabInfo = { tabId: null, domain: null, url: null, title: '', startTime: Date.now() };
  } else {
    // Browser regained focus — start tracking active tab
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (tabs[0]) updateActiveTab(tabs[0].id);
    });
  }
});

// Periodic flush every 30 seconds (in case user stays on the same tab)
chrome.alarms.create('webFlush', { periodInMinutes: 0.5 });

// Load web tracking preference
chrome.storage.local.get(['webTracking'], (result) => {
  webTrackingEnabled = result.webTracking !== false; // Default: enabled
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.webTracking !== undefined) {
    webTrackingEnabled = changes.webTracking.newValue;
    if (!webTrackingEnabled) {
      activeTabInfo = { tabId: null, domain: null, url: null, title: '', startTime: Date.now() };
    }
  }
});

// ─── YouTube Message Handler ────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRACK_ACTIVITY') {
    postToServer('/activity', message.data);
  }

  if (message.type === 'TRACK_PLAYLIST') {
    postToServer('/playlist', message.data);
  }

  if (message.type === 'TRACK_SEARCH') {
    postToServer('/search', message.data);
  }

  if (message.type === 'GET_TODAY_STATS') {
    fetchTodayStats().then(stats => sendResponse(stats)).catch(() => sendResponse(null));
    return true;
  }

  if (message.type === 'START_CUSTOM_TASK') {
    chrome.storage.local.set({ 
      customTask: { title: message.data.title, startTime: Date.now() } 
    });
    chrome.alarms.create('customTaskMotivate', { periodInMinutes: 15 });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'SYNC_START_CUSTOM_TASK') {
    chrome.storage.local.set({ customTask: { title: message.data.title, startTime: Date.now() } });
    chrome.alarms.create('customTaskMotivate', { periodInMinutes: 15 });
  }

  if (message.type === 'SYNC_STOP_CUSTOM_TASK') {
    chrome.storage.local.remove('customTask');
    chrome.alarms.clear('customTaskMotivate');
  }

  if (message.type === 'STOP_CUSTOM_TASK') {
    chrome.storage.local.get(['customTask'], (res) => {
      if (res.customTask) {
        const durationSeconds = Math.round((Date.now() - res.customTask.startTime) / 1000);
        postToServer('/custom-task', { title: res.customTask.title, durationSeconds });
        chrome.storage.local.remove('customTask');
        chrome.alarms.clear('customTaskMotivate');
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'GET_CUSTOM_TASK_STATE') {
    chrome.storage.local.get(['customTask'], (res) => {
      sendResponse(res.customTask || null);
    });
    return true;
  }
});

// ─── API Communication ──────────────────────────────────────────────────────

async function postToServer(endpoint, data) {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) console.error(`Server error on ${endpoint}:`, res.status);
  } catch (err) {
    console.error(`Failed to post to ${endpoint}:`, err.message);
  }
}

async function fetchTodayStats() {
  try {
    const res = await fetch('http://localhost:3001/api/stats/overview?range=today');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Daily Report Alarm ─────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('dailyReport', { periodInMinutes: 24 * 60 });
  
  // Initialize web tracking as enabled by default
  chrome.storage.local.get(['webTracking'], (result) => {
    if (result.webTracking === undefined) {
      chrome.storage.local.set({ webTracking: true });
    }
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReport') {
    chrome.notifications.create('dailyReportNotif', {
      type: 'basic',
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4YjVjZjYiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTIyIDEybC0xMCAxMC0xMC0xMGg1di0xMGgxMHYxMHoiLz48L3N2Zz4=',
      title: 'Your Daily Activity Report is Ready! 🎉',
      message: 'Check out how you spent your time today across the web.',
      requireInteraction: true
    });
  }
  
  if (alarm.name === 'webFlush') {
    flushActiveTime();
    // Reset start time to now for continuous tracking
    activeTabInfo.startTime = Date.now();
  }

  if (alarm.name === 'customTaskMotivate') {
    chrome.storage.local.get(['customTask'], (res) => {
      if (res.customTask) {
        const motivations = [
          { title: "Bro, you're cooking! 👨‍🍳", msg: "15 mins of pure grind on '{task}'. W focus, but don't forget to blink and take a sip of water bestie!" },
          { title: "Main character energy! 🌟", msg: "You ate that last 15 mins and left no crumbs on '{task}'. Maybe stretch those legs real quick?" },
          { title: "Rent is due! 💸", msg: "And you're delivering! Keep slaying '{task}', but stay hydrated, we need you at 100%." },
          { title: "It's giving CEO vibes 📈", msg: "Another 15 mins down on '{task}'. Grab a quick snack and let's go again!" },
          { title: "No cap, unmatched focus 🧢", msg: "You're literally built different. Keep grinding on '{task}', but take a deep breath first." }
        ];
        const randomMotiv = motivations[Math.floor(Math.random() * motivations.length)];
        const messageText = randomMotiv.msg.replace('{task}', res.customTask.title);
        const data = { title: randomMotiv.title, msg: messageText };

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
          if(tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'SHOW_GRIND_NUDGE', data: data }).catch(() => {});
          }
        });
        
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTEzIDEwbDQtNG0wIDBwbDQgNG0tNC00djEyIi8+PC9zdmc+',
          title: randomMotiv.title,
          message: messageText,
          requireInteraction: true
        });
      }
    });
  }
});

chrome.notifications.onClicked.addListener((notifId) => {
  if (notifId === 'dailyReportNotif') {
    chrome.tabs.create({ url: 'http://localhost:5173/dashboard' });
  }
});
