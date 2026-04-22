import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, BookOpen, MonitorPlay } from 'lucide-react';

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/stats')
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading your stats...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: '50px' }}>Failed to load data. Is the server running?</div>;

  const totalHours = (data.summary.totalWatchTime / 3600).toFixed(1);
  const learningHours = (data.summary.learningTime / 3600).toFixed(1);

  return (
    <div>
      <div className="dashboard-grid">
        <div className="glass-card">
          <div className="flex items-center gap-4">
            <Clock color="#8b5cf6" size={24} />
            <h3>Total Watch Time</h3>
          </div>
          <div className="stat-value">{totalHours} <span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>hrs</span></div>
        </div>
        
        <div className="glass-card">
          <div className="flex items-center gap-4">
            <BookOpen color="#ec4899" size={24} />
            <h3>Time Spent Learning</h3>
          </div>
          <div className="stat-value gradient-text">{learningHours} <span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>hrs</span></div>
        </div>

        <div className="glass-card">
          <div className="flex items-center gap-4">
            <MonitorPlay color="#3b82f6" size={24} />
            <h3>Channels Watched</h3>
          </div>
          <div className="stat-value">{data.channelData.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="glass-card">
          <h3>Top Channels</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.channelData.slice(0, 5).map(d => ({ ...d, hours: (d.value / 3600).toFixed(2) }))}>
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px'}} />
                <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card">
          <h3>Category Breakdown</h3>
          <div className="chart-container flex justify-center items-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.categoryData.map(d => ({ ...d, hours: (d.value / 3600).toFixed(2) }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="hours"
                >
                  {data.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ marginTop: '32px' }}>
        <h3>Playlist Progress</h3>
        {data.playlists.length === 0 ? (
          <p style={{ marginTop: '15px', color: 'var(--text-secondary)' }}>No playlist data tracked yet.</p>
        ) : (
          <div style={{ marginTop: '20px' }}>
            {data.playlists.map(pl => {
              const percentage = Math.round((pl.watchedVideos / pl.totalVideos) * 100) || 0;
              return (
                <div key={pl.playlistId} className="playlist-item flex items-center justify-between">
                  <div style={{ width: '80%' }}>
                    <h4>{pl.topic}</h4>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold' }}>{percentage}%</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {pl.watchedVideos} / {pl.totalVideos}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
