import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import { Activity } from 'lucide-react';

function App() {
  return (
    <Router>
      <nav className="navbar">
        <div className="container flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4" style={{ textDecoration: 'none', color: 'white' }}>
            <Activity color="#8b5cf6" size={28} />
            <h2>Activity<span className="gradient-text">Tracker</span></h2>
          </Link>
          <div className="flex gap-8 items-center">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
          </div>
        </div>
      </nav>
      <main className="container">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
