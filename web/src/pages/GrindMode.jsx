import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const MOTIVATIONS = [
  { title: "Bro, you're cooking! 👨‍🍳", msg: "W focus, keep it up bestie! Sip some water." },
  { title: "Main character energy! 🌟", msg: "You ate that and left no crumbs!" },
  { title: "Rent is due! 💸", msg: "Keep slaying, stay hydrated." },
  { title: "It's giving CEO vibes 📈", msg: "Grab a quick snack and let's go again!" },
  { title: "No cap, unmatched focus 🧢", msg: "You're literally built different." }
];

const FlipDigit = ({ digit }) => {
  if (digit === ':') {
    return <span style={{ margin: '0 12px', color: '#475569', fontSize: '0.8em', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transform: 'translateY(-4px)' }}>:</span>;
  }
  return (
    <div style={{ 
      position: 'relative', display: 'inline-flex', justifyContent: 'center', alignItems: 'center',
      width: '0.85em', height: '1.25em', background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', 
      borderRadius: '16px', margin: '0 2px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)', 
      overflow: 'hidden', perspective: '1000px', border: '1px solid #020617'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)', zIndex: 5 }} />
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', background: '#020617', zIndex: 10, marginTop: '-1px', boxShadow: '0 1px 0 rgba(255,255,255,0.05)' }} />
      <AnimatePresence mode="popLayout">
        <motion.div
          key={digit}
          initial={{ rotateX: 80, opacity: 0, filter: 'blur(2px)' }}
          animate={{ rotateX: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ rotateX: -80, opacity: 0, filter: 'blur(2px)' }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 100, damping: 15 }}
          style={{ position: 'absolute', color: '#f8fafc', transformOrigin: 'center' }}
        >
          {digit}
        </motion.div>
      </AnimatePresence>
      <span style={{ visibility: 'hidden' }}>0</span>
    </div>
  );
};

export default function GrindMode() {
  const [taskName, setTaskName] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [motivation, setMotivation] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('grindState');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.isRunning) {
        setTaskName(parsed.taskName);
        setStartTime(parsed.startTime);
        setIsRunning(true);
      }
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const lastNotified = useRef(0);

  useEffect(() => {
    let interval;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.floor((now - startTime) / 1000);
        setElapsed(diff);
        
        // Every 15 mins (900 seconds), show motivation
        if (diff > 0 && diff % 900 === 0 && lastNotified.current !== diff) {
          lastNotified.current = diff;
          const rand = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
          setMotivation(rand);
          setTimeout(() => setMotivation(null), 10000);
          
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(rand.title, { body: rand.msg });
            } catch(e) {
              console.error("Failed to show notification", e);
            }
          }
        }
      }, 1000);
    } else {
      setElapsed(0);
      lastNotified.current = 0;
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const handleStart = () => {
    if (!taskName.trim()) return;
    
    // Request permission precisely when the user clicks to start
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
    
    const now = Date.now();
    setStartTime(now);
    setIsRunning(true);
    localStorage.setItem('grindState', JSON.stringify({ isRunning: true, taskName, startTime: now }));
    
    window.postMessage({ type: 'SYNC_START_CUSTOM_TASK', data: { title: taskName } }, '*');
  };

  const handleStop = async () => {
    setIsRunning(false);
    localStorage.removeItem('grindState');
    window.postMessage({ type: 'SYNC_STOP_CUSTOM_TASK' }, '*');
    
    if (elapsed > 0) {
      try {
        await fetch(`${API}/track/custom-task`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: taskName, durationSeconds: elapsed })
        });
      } catch (err) {
        console.error('Failed to log custom task', err);
      }
    }
    setTaskName('');
    setStartTime(null);
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '80vh', position: 'relative', width: '100%'
    }}>
      <AnimatePresence>
        {motivation && (
          <motion.div 
            initial={{ opacity: 0, x: 120 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 120 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            style={{
              position: 'fixed', top: 80, right: 24, zIndex: 999999,
              background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 12,
              padding: '16px 20px', width: 320, boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              color: 'white', fontFamily: 'Inter, sans-serif', textAlign: 'left'
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                🔥
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#f1f5f9' }}>{motivation.title}</div>
            </div>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: 16, marginTop: 0 }}>
              {motivation.msg}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={() => setMotivation(null)}
                style={{
                  flex: 1, padding: 8, borderRadius: 6, border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', 
                  cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: '0.2s'
                }}
              >Let's Go!</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="glass-card"
        style={{
          width: '100%', maxWidth: 700, padding: 64, textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
          background: isRunning ? 'rgba(16,185,129,0.05)' : 'rgba(15,23,42,0.8)',
          border: isRunning ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)'
        }}
      >
        <h1 style={{ fontFamily: 'Outfit', fontSize: 48, fontWeight: 700, background: 'linear-gradient(to right, #8b5cf6, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          Zen Grind Mode 🧘‍♂️
        </h1>
        <p style={{ color: '#AAAAAA', fontSize: 16, marginTop: -20 }}>Lock in and crush your goals.</p>
        
        {!isRunning ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <input 
              type="text" 
              placeholder="What are we conquering today?" 
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              style={{
                width: '100%', padding: '20px 24px', fontSize: 20, borderRadius: 12,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'white', outline: 'none', textAlign: 'center'
              }}
              onFocus={e => e.target.style.borderColor = '#8b5cf6'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            <button 
              onClick={handleStart}
              disabled={!taskName.trim()}
              style={{
                padding: '18px', fontSize: 20, fontWeight: 700, borderRadius: 12,
                background: taskName.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.1)',
                color: taskName.trim() ? 'white' : 'rgba(255,255,255,0.4)',
                border: 'none', cursor: taskName.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'transform 0.2s'
              }}
              onMouseEnter={e => { if(taskName.trim()) e.target.style.transform = 'scale(1.02)' }}
              onMouseLeave={e => { if(taskName.trim()) e.target.style.transform = 'scale(1)' }}
            >
              <Play fill="currentColor" size={24} /> Enter Grind Mode
            </button>
          </div>
        ) : (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
            <h2 style={{ fontSize: 28, fontWeight: 600, color: '#f1f5f9', margin: 0 }}>{taskName}</h2>
            
            <div style={{ 
              fontFamily: 'Inter, sans-serif', fontSize: 100, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20
            }}>
              {formatTime(elapsed).split('').map((char, i) => (
                <FlipDigit key={i} digit={char} />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 20 }}>
              <button 
                onClick={handleStop}
                style={{
                  padding: '20px 40px', fontSize: 20, fontWeight: 700, borderRadius: 12,
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: 'white',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
              >
                <Square fill="currentColor" size={24} /> Stop Session
              </button>
              
              <button 
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
                style={{
                  padding: '20px', fontSize: 20, borderRadius: 12,
                  background: 'rgba(255,255,255,0.1)', color: 'white',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
              >
                {isFullscreen ? <Minimize size={28} /> : <Maximize size={28} />}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
