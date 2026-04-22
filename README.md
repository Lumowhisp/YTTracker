# YTTracker

YouTube Activity Tracker using a React frontend, an Express/MongoDB backend, and a Chrome Extension.

## 1. The React Web App (`web/`)
The web application provides a stunning, premium aesthetic featuring dark mode, glassmorphism UI elements, and colorful gradient accents.
- **Landing Page**: Communicates the value proposition and offers a direct download link for the extension.
- **Dashboard**: Features dynamic visualizations powered by `recharts`.

## 2. The Node.js Express API (`server/`)
The backend is securely connected to MongoDB. 
- It logs watch times incrementally as the extension sends chunks of active viewing.
- It calculates aggregated data to serve to the dashboard.

## 3. The Chrome Extension (`extension/`)
A fully-featured Manifest V3 extension.
- **Smart Tracking**: Automatically pauses tracking when the video is paused or you switch away from the tab via background polling.
- **Content Categorization**: Parses YouTube metadata to determine if a video is educational or entertainment.
- **Playlist Tracking**: Watches the DOM for the playlist side-panel and records your progress in real-time.

## How to Run the App

### 1. Start the Backend Server
```bash
cd server
npm install
node index.js
```

### 2. Start the Frontend React App
```bash
cd web
npm install
npm run dev
```

### 3. Load the Extension
1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** in the top right corner.
3. Click **Load unpacked** in the top left.
4. Select the `extension` folder inside this directory.
