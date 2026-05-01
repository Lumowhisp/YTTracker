// Fetch today's stats from background and render
const contentEl = document.getElementById('content');

chrome.runtime.sendMessage({ type: 'GET_TODAY_STATS' }, (response) => {
  if (!response || !response.summary) {
    contentEl.innerHTML = `
      <div class="stats">
        <div class="stat-card" style="grid-column: span 2; text-align: center;">
          <p style="color: #64748b; font-size: 13px; padding: 8px 0;">
            No data yet today. Start watching YouTube!<br>
            <span style="font-size: 11px; color: #475569; margin-top: 4px; display: inline-block;">
              Make sure the server is running on port 3001
            </span>
          </p>
        </div>
      </div>`;
    return;
  }

  const s = response.summary;
  const watchMins = Math.round(s.totalWatchTime / 60);
  const learnMins = Math.round(s.learningTime / 60);
  const score = s.productivityScore || 0;

  // Score ring circumference
  const r = 23;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  let scoreLabel = 'Keep going!';
  if (score >= 80) scoreLabel = 'Excellent focus! 🔥';
  else if (score >= 60) scoreLabel = 'Good balance! 👍';
  else if (score >= 40) scoreLabel = 'Room to improve';

  contentEl.innerHTML = `
    <div class="stats">
      <div class="stat-card score-card">
        <div class="score-ring">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle class="bg" cx="28" cy="28" r="${r}"/>
            <circle class="fg" cx="28" cy="28" r="${r}"
              stroke-dasharray="${circ}"
              stroke-dashoffset="${offset}"/>
          </svg>
          <div class="score-text">${score}</div>
        </div>
        <div class="score-info">
          <div class="stat-label">Productivity Score</div>
          <p>${scoreLabel}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Watch Time</div>
        <div class="stat-value">${watchMins}<span class="stat-unit"> min</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Learning</div>
        <div class="stat-value" style="color: #8b5cf6;">${learnMins}<span class="stat-unit"> min</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Videos</div>
        <div class="stat-value">${s.videosWatched || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Channels</div>
        <div class="stat-value">${s.channelsWatched || 0}</div>
      </div>
    </div>`;
});

// Zen Mode Toggle Logic
const zenModeToggle = document.getElementById('zenModeToggle');

// Load current state
chrome.storage.local.get(['zenMode'], (result) => {
  zenModeToggle.checked = !!result.zenMode;
});

// Save state on change
zenModeToggle.addEventListener('change', (e) => {
  const isEnabled = e.target.checked;
  chrome.storage.local.set({ zenMode: isEnabled });
});
