const API_URL = "http://localhost:3001/api/track";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRACK_ACTIVITY') {
    fetch(`${API_URL}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.data)
    })
    .then(res => res.json())
    .then(data => console.log('Activity logged:', data))
    .catch(err => console.error('Error logging activity:', err));
  }
  
  if (message.type === 'TRACK_PLAYLIST') {
    fetch(`${API_URL}/playlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.data)
    })
    .then(res => res.json())
    .then(data => console.log('Playlist logged:', data))
    .catch(err => console.error('Error logging playlist:', err));
  }
  
  return true;
});
