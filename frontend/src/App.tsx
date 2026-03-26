import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';

// This wrapper component handles showing/hiding the Navbar
const AppContent: React.FC = () => {
  const location = useLocation();
  
  // Hide Navbar if we are on the dashboard
  const showNavbar = location.pathname !== '/dashboard';

  return (
    <div className="min-h-screen bg-white">
      {showNavbar && <Navbar />}
      
      <main>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<Home />} />
          
          {/* Auth Pages (Login/Register) */}
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />

          {/* Chat Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* 404 Page */}
          <Route path="*" element={<div className="p-20 text-center text-2xl">404 - Page Not Found</div>} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;