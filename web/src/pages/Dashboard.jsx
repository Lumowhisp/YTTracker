import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { Clock, BookOpen, MonitorPlay, Sparkles, TrendingUp, Calendar, Search, Target, Flame, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = 'http://localhost:3001/api';
const COLORS = ['#FF0000', '#3EA6FF', '#2BA640', '#F2A900', '#A855F7', '#EC4899', '#06B6D4', '#F43F5E'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const QUOTES = [
  "Focus on being productive instead of busy.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Learning never exhausts the mind. — Leonardo da Vinci",
  "Invest in your mind; it pays the best interest.",
  "The secret of getting ahead is getting started.",
  "Don't count the days, make the days count."
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10);
    if (isNaN(end)) {
      setDisplay(value);
      return;
    }
    const duration = 1200;
    const startTimestamp = performance.now();
    let reqId;
    const step = (timestamp) => {
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      setDisplay(Math.floor(ease * end));
      if (progress < 1) {
        reqId = window.requestAnimationFrame(step);
      } else {
        setDisplay(end);
      }
    };
    reqId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(reqId);
  }, [value]);
  return <>{display}</>;
}

function ScoreRing({ score, size = 120 }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? '#2BA640' : score >= 40 ? '#F2A900' : '#FF0000';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }} />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontFamily:'Outfit', fontSize: size * 0.3, fontWeight:700 }}>{score}</span>
        <span style={{ fontSize:11, color:'#64748b' }}>/ 100</span>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, iconColor, label, value, unit, delay = 0 }) {
  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay }}
      whileHover={{ y: -6, scale: 1.02, boxShadow: '0 12px 32px rgba(0,0,0,0.4)' }}
      className="glass-card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, color:'#AAAAAA' }}>
        <Icon size={20} color={iconColor} />
        <span style={{ fontSize:14, fontWeight:500, color: '#F1F1F1' }}>{label}</span>
      </div>
      <div style={{ fontFamily:'Outfit', fontSize:36, fontWeight:700 }}>
        <AnimatedNumber value={value} /><span style={{ fontSize:14, color:'#64748b', fontFamily:'Inter', fontWeight:400, marginLeft:4 }}>{unit}</span>
      </div>
    </motion.div>
  );
}

function Heatmap({ matrix }) {
  if (!matrix || matrix.length === 0) return null;
  const max = Math.max(1, ...matrix.flat());
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8, width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(24, 1fr)', gap: 4, minWidth: 700 }}>
        {/* Header Row */}
        <div />
        {Array.from({ length: 24 }).map((_, hour) => {
          let label = '';
          if (hour % 2 === 0) {
            label = hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`;
          }
          return (
            <div key={hour} style={{ fontSize: 10, color: '#AAAAAA', textAlign: 'center', paddingBottom: 4 }}>
              {label}
            </div>
          );
        })}
        
        {/* Matrix Rows */}
        {WEEKDAYS.map((day, di) => (
          <React.Fragment key={di}>
            <div style={{ fontSize: 12, color: '#AAAAAA', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
              {day}
            </div>
            {Array.from({ length: 24 }, (_, hi) => {
              const val = matrix[di]?.[hi] || 0;
              const intensity = val > 0 ? Math.max(0.3, val / max) : 0;
              const bg = val === 0 ? 'rgba(255,255,255,0.03)' : `rgba(255, 0, 0, ${intensity})`;
              return (
                <div key={hi} title={`${day} ${hi}:00 — ${val} min`} className="heatmap-cell" style={{
                  background: bg,
                  border: val > 0 ? '1px solid rgba(255,0,0,0.2)' : '1px solid rgba(255,255,255,0.02)'
                }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function VideoCard({ video, delay = 0 }) {
  const mins = Math.round((video.watchTimeSeconds || 0) / 60);
  const [isLearning, setIsLearning] = useState(video.isLearning);
  const [needsReview, setNeedsReview] = useState(video.needsReview);

  const handleToggle = async (e) => {
    e.stopPropagation();
    try {
      const newLearningState = !isLearning;
      setIsLearning(newLearningState);
      setNeedsReview(false);
      
      await fetch('http://localhost:3001/api/track/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          videoId: video.videoId, 
          isLearning: newLearningState, 
          title: video.title, 
          category: video.category 
        })
      });
    } catch (err) {
      console.error('Feedback failed:', err);
      // Revert optimistic update on failure
      setIsLearning(!isLearning);
      setNeedsReview(true);
    }
  };

  return (
    <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.06)' }}
    style={{
      display:'flex', gap:12, padding:10, borderRadius:12, background:'rgba(39,39,39,0.5)',
      border: needsReview ? '1px solid rgba(242,169,0,0.5)' : '1px solid rgba(255,255,255,0.04)', 
      boxShadow: needsReview ? '0 0 10px rgba(242,169,0,0.1)' : 'none',
      cursor:'pointer'
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = needsReview ? 'rgba(242,169,0,0.8)' : 'rgba(255,0,0,0.4)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = needsReview ? 'rgba(242,169,0,0.5)' : 'rgba(255,255,255,0.04)'}
    onClick={() => window.open(`https://youtube.com/watch?v=${video.videoId}`, '_blank')}>
      <img src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
        alt="" style={{ width:120, height:68, borderRadius:8, objectFit:'cover', flexShrink:0, background:'#272727' }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{video.title}</div>
        <div style={{ fontSize:12, color:'#AAAAAA', marginBottom:6 }}>{video.channel}</div>
        <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:11 }}>
          <button onClick={handleToggle} title={needsReview ? "Click to fix category" : "Click to toggle category"}
            style={{ 
              background:'transparent', border:'none', cursor:'pointer', padding:0, display:'flex', alignItems:'center',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ color: isLearning ? '#3EA6FF' : '#AAAAAA',
              background: isLearning ? 'rgba(62,166,255,0.1)' : 'rgba(255,255,255,0.04)',
              padding:'2px 8px', borderRadius:6 }}>
              {isLearning ? '📚 Learning' : '🎬 Entertainment'}
            </span>
          </button>
          
          <span style={{ color:'#AAAAAA' }}>{mins} min</span>
          {video.completionPercent > 0 && <span style={{ color:'#F1F1F1', fontWeight:500, background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>{video.completionPercent}%</span>}
          
          {needsReview && (
            <span style={{ color:'#F2A900', marginLeft:'auto', fontSize: 10, background:'rgba(242,169,0,0.1)', padding:'2px 6px', borderRadius:4 }}>
              ⚠️ Needs Review
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ 
        background:'rgba(15, 15, 15, 0.9)', 
        border:'1px solid rgba(255,255,255,0.1)', 
        borderRadius:12, padding:'16px', 
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)', 
        backdropFilter: 'blur(12px)',
        minWidth: 160
      }}
    >
      <div style={{ fontSize:11, color:'#AAAAAA', marginBottom:12, textTransform:'uppercase', letterSpacing:1, fontWeight:600 }}>{label}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {payload.map((p, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:500 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:p.color, boxShadow:`0 0 8px ${p.color}` }} />
            <span style={{ color:'#F1F1F1' }}>{p.name}</span>
            <span style={{ color:'#AAAAAA', marginLeft:'auto', paddingLeft:16 }}>{p.value} min</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const [range, setRange] = useState('7d');
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [heatmap, setHeatmapData] = useState([]);
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recent, setRecent] = useState([]);
  const [searches, setSearches] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quoteIdx, setQuoteIdx] = useState(0);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const safeFetch = (url) => fetch(url).then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      });
      const [ov, tr, hm, ch, cat, rec, srch, pl] = await Promise.all([
        safeFetch(`${API}/stats/overview?range=${range}`),
        safeFetch(`${API}/stats/trends?days=${range==='today'?1:range==='7d'?7:range==='30d'?30:90}`),
        safeFetch(`${API}/stats/heatmap?range=${range}`),
        safeFetch(`${API}/stats/channels?range=${range}`),
        safeFetch(`${API}/stats/categories?range=${range}`),
        safeFetch(`${API}/stats/recent?limit=10`),
        safeFetch(`${API}/stats/searches?limit=10`),
        safeFetch(`${API}/stats/playlists`),
      ]);
      setOverview(ov); setTrends(tr); setHeatmapData(hm); setChannels(ch);
      setCategories(cat); setRecent(rec); setSearches(srch); setPlaylists(pl);
    } catch(e) {
      console.error('Fetch error:', e);
      setError('Could not load data. Make sure the server is running and the database is connected.');
    }
    setLoading(false);
  }, [range]);

  useEffect(() => { 
    setLoading(true); 
    fetchAll(); 
    
    // Polling interval for real-time updates without page refresh
    const intervalId = setInterval(() => {
      fetchAll();
    }, 10000); // 10 seconds
    
    return () => clearInterval(intervalId);
  }, [fetchAll]);
  useEffect(() => {
    const i = setInterval(() => setQuoteIdx(p => (p+1) % QUOTES.length), 8000);
    return () => clearInterval(i);
  }, []);

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh' }}>
      <motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:1, ease:'linear' }}
        style={{ width:48, height:48, border:'4px solid rgba(255,255,255,0.06)', borderTopColor:'#FF0000', borderRadius:'50%' }} />
    </div>
  );

  const s = overview?.summary || {};
  const totalMins = Math.round((s.totalWatchTime || 0) / 60);
  const learnMins = Math.round((s.learningTime || 0) / 60);
  const maxCh = channels.length > 0 ? channels[0].minutes : 1;

  return (
    <div style={{ paddingTop:32, paddingBottom:80 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:32, flexWrap:'wrap', gap:16 }}>
        <h1 style={{ fontFamily:'Outfit', fontSize:32, fontWeight:700 }}>Dashboard</h1>
        <div className="range-selector">
          {['today','7d','30d','all'].map(r => (
            <button key={r} className={`range-btn ${range===r?'active':''}`} onClick={() => setRange(r)}>
              {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Motivation */}
      <div className="glass-card" style={{ marginBottom:24, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, width:3, height:'100%', background:'#FF0000' }} />
        <div style={{ display:'flex', alignItems:'center', gap:12, paddingLeft:8 }}>
          <Sparkles size={20} color="#FF0000" />
          <AnimatePresence mode="wait">
            <motion.p key={quoteIdx} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
              style={{ fontSize:16, fontStyle:'italic', color:'#F1F1F1' }}>
              "{QUOTES[quoteIdx]}"
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Score + Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr 1fr 1fr 1fr', gap:16, marginBottom:24, alignItems:'stretch' }}>
        <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} className="glass-card"
          whileHover={{ y: -6, scale: 1.02, boxShadow: '0 12px 32px rgba(0,0,0,0.4)' }}
          style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, cursor: 'pointer' }}>
          <ScoreRing score={s.productivityScore || 0} />
          <div style={{ marginTop:8, fontSize:13, color:'#64748b', fontWeight:500 }}>Productivity</div>
        </motion.div>
        <StatCard icon={Clock} iconColor="#FF0000" label="Watch Time" value={totalMins} unit="min" delay={0.1} />
        <StatCard icon={BookOpen} iconColor="#3EA6FF" label="Learning" value={learnMins} unit="min" delay={0.2} />
        <StatCard icon={MonitorPlay} iconColor="#2BA640" label="Videos" value={s.videosWatched||0} unit="" delay={0.3} />
        <StatCard icon={Target} iconColor="#F2A900" label="Avg Completion" value={s.avgCompletion||0} unit="%" delay={0.4} />
      </div>

      {/* Trend + Categories */}
      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:16, marginBottom:24 }}>
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}} className="glass-card">
          <div className="section-title"><TrendingUp size={18} color="#FF0000" /> Watch Trend</div>
          <div style={{ height:260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF0000" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#FF0000" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gLearn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3EA6FF" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#3EA6FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="#717171" tickLine={false} axisLine={false} fontSize={11} tickMargin={12} />
                <YAxis stroke="#717171" tickLine={false} axisLine={false} fontSize={11} tickMargin={12} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} isAnimationActive={false} />
                <Area type="monotone" dataKey="totalMinutes" name="Total" stroke="#FF0000" fill="url(#gTotal)" strokeWidth={3} activeDot={{ r: 6, fill: '#FF0000', stroke: '#151515', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="learningMinutes" name="Learning" stroke="#3EA6FF" fill="url(#gLearn)" strokeWidth={3} activeDot={{ r: 6, fill: '#3EA6FF', stroke: '#151515', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}} className="glass-card">
          <div className="section-title">Category Breakdown</div>
          {categories.length === 0 ? <p style={{color:'#64748b', textAlign:'center', padding:40}}>No data yet</p> : (
            <>
              <div style={{ height:180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categories} cx="50%" cy="50%" innerRadius={58} outerRadius={85} paddingAngle={2} cornerRadius={6} dataKey="minutes" stroke="none">
                      {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#272727" strokeWidth={3} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} isAnimationActive={false} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
                {categories.slice(0,5).map((c,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#94a3b8' }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:COLORS[i%COLORS.length] }} />
                    {c.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Heatmap */}
      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}} className="glass-card" style={{ marginBottom:24 }}>
        <div className="section-title"><Flame size={18} color="#F2A900" /> Activity by Time of Day</div>
        <p style={{ fontSize:12, color:'#AAAAAA', marginBottom:20 }}>Discover when you are most active during the week.</p>
        <Heatmap matrix={heatmap} />
      </motion.div>

      {/* Channels + Recent */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.6}} className="glass-card">
          <div className="section-title"><Play size={18} color="#FF0000" /> Top Channels</div>
          {channels.length === 0 ? <p style={{color:'#64748b', textAlign:'center', padding:24}}>No data yet</p> : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {channels.slice(0,6).map((ch,i) => (
                <div key={i}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                    <span style={{ fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'70%' }}>{ch.name}</span>
                    <span style={{ color:'#F1F1F1', fontWeight:600 }}>{ch.minutes} min</span>
                  </div>
                  <div style={{ height:6, background:'rgba(255,255,255,0.04)', borderRadius:3, overflow:'hidden' }}>
                    <motion.div initial={{width:0}} animate={{width:`${(ch.minutes/maxCh)*100}%`}}
                      transition={{duration:1, delay:0.2+i*0.1}}
                      style={{ height:'100%', background:`linear-gradient(to right, ${COLORS[i%COLORS.length]}, ${COLORS[(i+1)%COLORS.length]})`, borderRadius:3 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.7}} className="glass-card" style={{ maxHeight:420, overflowY:'auto' }}>
          <div className="section-title"><Calendar size={18} color="#3EA6FF" /> Recent Videos</div>
          {recent.length === 0 ? <p style={{color:'#64748b', textAlign:'center', padding:24}}>No videos tracked yet</p> : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {recent.map((v,i) => <VideoCard key={i} video={v} delay={0.8 + i*0.05} />)}
            </div>
          )}
        </motion.div>
      </div>

      {/* Playlists */}
      {playlists.length > 0 && (
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.8}} className="glass-card" style={{ marginBottom:24 }}>
          <div className="section-title"><BookOpen size={18} color="#10b981" /> Playlist Progress</div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {playlists.map(pl => {
              const pct = Math.round((pl.watchedVideos / Math.max(pl.totalVideos,1)) * 100);
              return (
                <div key={pl.playlistId} style={{ display:'flex', alignItems:'center', gap:16, padding:12, borderRadius:12, background:'rgba(39,39,39,0.5)', border:'1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, marginBottom:6 }}>{pl.topic}</div>
                    <div style={{ height:6, background:'rgba(255,255,255,0.04)', borderRadius:3, overflow:'hidden' }}>
                      <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:1}}
                        style={{ height:'100%', background:'#FF0000', borderRadius:3 }} />
                    </div>
                  </div>
                  <div style={{ textAlign:'right', minWidth:60 }}>
                    <div style={{ fontFamily:'Outfit', fontSize:20, fontWeight:700, color: '#F1F1F1' }}>{pct}%</div>
                    <div style={{ fontSize:11, color:'#64748b' }}>{pl.watchedVideos}/{pl.totalVideos}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Searches */}
      {searches.length > 0 && (
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.9}} className="glass-card">
          <div className="section-title"><Search size={18} color="#f59e0b" /> Recent Searches</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {searches.map((s,i) => (
              <span key={i} style={{
                padding:'6px 14px', borderRadius:100, fontSize:13,
                background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)',
                color:'#94a3b8', cursor:'pointer', transition:'all 0.2s'
              }}
              onMouseEnter={e => { e.target.style.borderColor='rgba(255,0,0,0.4)'; e.target.style.color='#f1f5f9'; }}
              onMouseLeave={e => { e.target.style.borderColor='rgba(255,255,255,0.06)'; e.target.style.color='#94a3b8'; }}
              onClick={() => window.open(`https://youtube.com/results?search_query=${encodeURIComponent(s.query)}`, '_blank')}>
                {s.query}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
