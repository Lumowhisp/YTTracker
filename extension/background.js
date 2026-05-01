/**
 * YouTube Activity Tracker — Background Service Worker
 * Handles API communication, daily report alarms, and notifications.
 */
const API_URL = 'http://localhost:3001/api/track';

// ─── Message Handler ────────────────────────────────────────────────────────

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
    return true; // Keep channel open for async response
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
  chrome.alarms.clearAll();
  chrome.alarms.create('dailyReport', { periodInMinutes: 24 * 60 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReport') {
    chrome.notifications.create('dailyReportNotif', {
      type: 'basic',
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4YjVjZjYiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTIyIDEybC0xMCAxMC0xMC0xMGg1di0xMGgxMHYxMHoiLz48L3N2Zz4=',
      title: 'Your Daily YouTube Report is Ready! 🎉',
      message: 'Check out how you spent your time today. Click to view your dashboard.',
      requireInteraction: true
    });
  }
});

chrome.notifications.onClicked.addListener((notifId) => {
  if (notifId === 'dailyReportNotif') {
    chrome.tabs.create({ url: 'http://localhost:5173/dashboard' });
  }
});
