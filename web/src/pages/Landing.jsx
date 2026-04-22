import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="hero">
      <h1>Track Your <span className="gradient-text">YouTube</span> Journey</h1>
      <p>
        Quietly monitor your watch time, categorize your learning, and track playlist progress automatically. Stop guessing, start measuring.
      </p>
      <div className="flex justify-center gap-4">
        <a href="/extension.zip" download="ActivityTrackerExtension.zip" className="btn-primary">
          Download Extension
        </a>
        <Link to="/dashboard" className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--accent-primary)' }}>
          View Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-8" style={{ marginTop: '80px', textAlign: 'left' }}>
        <div className="glass-card">
          <h3 style={{ color: 'var(--accent-primary)', marginBottom: '10px' }}>Insights</h3>
          <p>Detailed breakdown of exactly how much time you spend on each channel.</p>
        </div>
        <div className="glass-card">
          <h3 style={{ color: 'var(--accent-secondary)', marginBottom: '10px' }}>Learning Mode</h3>
          <p>Automatically categorizes educational content to see your learning progress.</p>
        </div>
        <div className="glass-card">
          <h3 style={{ color: 'var(--accent-primary)', marginBottom: '10px' }}>Playlists</h3>
          <p>Track your completion rate across multi-video tutorials and courses.</p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
