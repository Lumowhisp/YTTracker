import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Brain, ListChecks, Search, Clock, Shield, ChevronRight } from 'lucide-react';

const features = [
  {
    icon: Clock,
    color: '#8b5cf6',
    title: 'Precision Time Tracking',
    desc: 'Every second of watch time tracked accurately — even across YouTube\'s SPA navigation.'
  },
  {
    icon: Brain,
    color: '#ec4899',
    title: 'Smart Categorization',
    desc: 'AI-powered detection of educational vs entertainment content using 30+ keyword signals.'
  },
  {
    icon: BarChart3,
    color: '#06b6d4',
    title: 'Deep Analytics',
    desc: 'Activity heatmaps, trend charts, channel breakdowns, and productivity scoring.'
  },
  {
    icon: ListChecks,
    color: '#10b981',
    title: 'Playlist Progress',
    desc: 'Track completion rates across multi-video courses and tutorial series.'
  },
  {
    icon: Search,
    color: '#f59e0b',
    title: 'Search Insights',
    desc: 'See what you search for and discover your curiosity patterns over time.'
  },
  {
    icon: Shield,
    color: '#6366f1',
    title: 'Privacy First',
    desc: 'All data stays on your local machine. No cloud sync, no third-party analytics.'
  }
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' } })
};

const Landing = () => {
  return (
    <div style={{ paddingTop: '60px', paddingBottom: '80px' }}>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 80px' }}
      >
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: '100px', padding: '6px 16px', marginBottom: '24px',
          fontSize: '13px', color: '#a78bfa', fontWeight: 500
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></span>
          v2.0 — Industry Standard Tracking
        </div>

        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '56px', fontWeight: 700, lineHeight: 1.1, marginBottom: '24px' }}>
          Know Exactly How<br/>You Spend Time on{' '}
          <span className="gradient-text">YouTube</span>
        </h1>

        <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: 1.7, maxWidth: '560px', margin: '0 auto 40px' }}>
          A silent Chrome extension that tracks every second of your YouTube activity.
          Get productivity scores, learning insights, and beautiful analytics — all running locally.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <a href="/extension.zip" download="ActivityTrackerExtension.zip" className="btn-primary" style={{ fontSize: '15px' }}>
            Download Extension
            <ChevronRight size={18} style={{ marginLeft: 4 }} />
          </a>
          <Link to="/dashboard" className="btn-secondary" style={{ fontSize: '15px' }}>
            View Dashboard
          </Link>
        </div>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        style={{
          display: 'flex', justifyContent: 'center', gap: '48px',
          marginBottom: '80px', flexWrap: 'wrap'
        }}
      >
        {[
          { label: 'Tracking Accuracy', value: '99.9%' },
          { label: 'Data Points / Session', value: '50+' },
          { label: 'Privacy Score', value: '100%' },
          { label: 'Setup Time', value: '<1 min' }
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '28px', fontWeight: 700 }}
              className="gradient-text-cyan">{stat.value}</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Features grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px', marginBottom: '80px'
      }}>
        {features.map((f, i) => (
          <motion.div
            key={i}
            custom={i}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="glass-card"
            style={{ cursor: 'default' }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `${f.color}15`, display: 'flex',
              alignItems: 'center', justifyContent: 'center', marginBottom: 16
            }}>
              <f.icon size={22} color={f.color} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{f.title}</h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>{f.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        style={{ textAlign: 'center', marginBottom: '40px' }}
      >
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '36px', fontWeight: 700, marginBottom: '48px' }}>
          How It <span className="gradient-text">Works</span>
        </h2>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap' }}>
          {[
            { step: '01', title: 'Install', desc: 'Load the extension in Chrome Developer Mode' },
            { step: '02', title: 'Browse', desc: 'Watch YouTube as you normally would' },
            { step: '03', title: 'Analyze', desc: 'Open the dashboard to see your insights' }
          ].map((s, i) => (
            <motion.div
              key={i}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              style={{
                flex: '1 1 200px', maxWidth: '280px',
                padding: '32px 24px', borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(15,23,42,0.5)'
              }}
            >
              <div style={{
                fontFamily: 'Outfit, sans-serif', fontSize: '36px', fontWeight: 700,
                marginBottom: '12px'
              }} className="gradient-text-cyan">{s.step}</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{s.title}</h3>
              <p style={{ fontSize: '14px', color: '#94a3b8' }}>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Landing;
