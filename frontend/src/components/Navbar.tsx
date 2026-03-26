import React from 'react';
import { Link } from 'react-router-dom';
// import logoUrl from '../assets/logo.png'; // Path to your saved logo

const Navbar: React.FC = () => {
  // Use 2.png from the public folder
  const logoUrl = "/2.png";

  return (
    <nav className="flex items-center justify-between px-6 md:px-20 py-3 bg-[#2563eb]/80 backdrop-blur-md text-white sticky top-0 z-50 border-b border-white/10 shadow-sm">
      
      {/* Logo Section */}
      <Link to="/" className="flex items-center gap-3 text-xl font-bold tracking-tighter">
        <img 
          src={logoUrl} 
          alt="NexusChat Logo" 
          className="w-9 h-9 object-contain bg-white rounded-lg p-0.5 shadow-sm" 
        />
        <span className="hidden sm:inline">NexusChat</span>
      </Link>
      
      <div className="hidden md:flex items-center space-x-6 text-sm font-medium opacity-90">
        <a href="#features" className="hover:text-[#bef264] transition-colors">Our Story</a>
        <a href="#solutions" className="hover:text-[#bef264] transition-colors">Products</a>
        <a href="#blog" className="hover:text-[#bef264] transition-colors">Blog</a>
        <a href="#contact" className="hover:text-[#bef264] transition-colors">Contact</a>
      </div>

      <Link 
        to="/register" 
        className="bg-white text-blue-600 px-5 py-2 rounded-full text-sm font-bold hover:bg-[#bef264] hover:text-black transition-all duration-300 shadow-md active:scale-95"
      >
        Get Started free
      </Link>
    </nav>
  );
};

export default Navbar;