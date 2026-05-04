// overlay.js - Injected into <all_urls>

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data && event.data.type === 'SYNC_START_CUSTOM_TASK') {
    chrome.runtime.sendMessage(event.data);
  }
  if (event.data && event.data.type === 'SYNC_STOP_CUSTOM_TASK') {
    chrome.runtime.sendMessage(event.data);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SHOW_GRIND_NUDGE') {
    showGrindOverlay(message.data);
  }
});

function showGrindOverlay(data) {
  if (document.getElementById('grind-tracker-nudge')) return;
  
  const nudge = document.createElement('div');
  nudge.id = 'grind-tracker-nudge';
  nudge.innerHTML = `
    <div style="
      position: fixed; top: 80px; right: 24px; z-index: 2147483647;
      background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(16px);
      border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 12px;
      padding: 16px 20px; width: 320px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      color: white; font-family: 'Inter', sans-serif; text-align: left;
      transform: translateX(120%); transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    ">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(16, 185, 129, 0.2); display: flex; align-items: center; justify-content: center; font-size: 16px;">🔥</div>
        <div style="font-weight: 600; font-size: 15px; color: #f1f5f9;">${data.title}</div>
      </div>
      <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 16px; margin-top: 0;">
        ${data.msg}
      </p>
      <div style="display: flex; gap: 8px;">
        <button id="grind-nudge-close" style="
          flex: 1; padding: 8px; border-radius: 6px; border: none;
          background: linear-gradient(135deg, #10b981, #059669); color: white; cursor: pointer; font-size: 13px; transition: 0.2s; font-weight: 600;
        ">Let's Go!</button>
      </div>
    </div>
  `;
  document.body.appendChild(nudge);

  setTimeout(() => {
    if(nudge.firstElementChild) nudge.firstElementChild.style.transform = 'translateX(0)';
  }, 100);

  document.getElementById('grind-nudge-close').onclick = () => {
    nudge.firstElementChild.style.transform = 'translateX(120%)';
    setTimeout(() => nudge.remove(), 500);
  };
}
