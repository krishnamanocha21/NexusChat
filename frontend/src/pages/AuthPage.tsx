
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Add this

const AuthPage: React.FC = () => {
  // Initial state is true (Login Mode), window starts on the right
  const [isLoginMode, setIsLoginMode] = useState(true);
  const navigate = useNavigate(); // Initialize navigate

  // Add this function
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login and redirect
    navigate('/dashboard');
  };

  const brandBlue = '#2563eb';
  const brandLime = '#bef264';
  const logoUrl = "/2.png";

  const socialIcons = [
    { name: 'Facebook', icon: '📷' },
    { name: 'Google', icon: '🐦' },
    { name: 'LinkedIn', icon: '🎥' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 font-sans">
      {/* Main Container */}
      <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl relative overflow-hidden h-[700px] flex">
        
        {/* --- BLUE SLIDING PANEL --- 
            Stays on the right (left-1/2) initially because isLoginMode is true.
        */}
        <div
          className={`absolute top-0 h-full w-1/2 text-white transition-all duration-700 ease-in-out z-30 flex items-center justify-center ${
            isLoginMode ? 'left-1/2' : 'left-0' 
          }`}
          style={{ backgroundColor: brandBlue }}
        >
          <div className="space-y-8 p-12 text-center">
            
            {/* View shown when panel is on the LEFT (User is looking at Register form) */}
            <div className={`transition-all duration-700 ${isLoginMode ? 'opacity-0 scale-90 pointer-events-none absolute' : 'opacity-100 scale-100'}`}>
              <h2 className="text-5xl font-extrabold mb-4">Welcome Back!</h2>
              <p className="text-lg text-blue-100 mb-8 max-w-xs mx-auto">
                Already have an account? Log in to continue your experience.
              </p>
              <button
                onClick={() => setIsLoginMode(true)}
                style={{ backgroundColor: brandLime }}
                className="text-black font-bold px-12 py-3 rounded-full hover:brightness-110 active:scale-95 transition-all shadow-lg"
              >
                SIGN UP
              </button>
            </div>

            {/* View shown when panel is on the RIGHT (User is looking at Login form) */}
            <div className={`transition-all duration-700 ${!isLoginMode ? 'opacity-0 scale-90 pointer-events-none absolute' : 'opacity-100 scale-100'}`}>
              <h2 className="text-5xl font-extrabold mb-4">Hey There!</h2>
              <p className="text-lg text-blue-100 mb-8 max-w-xs mx-auto">
                Don't have an account yet? Start your journey with us today.
              </p>
              <button
                onClick={() => setIsLoginMode(false)}
                style={{ backgroundColor: brandLime }}
                className="text-black font-bold px-12 py-3 rounded-full hover:brightness-110 active:scale-95 transition-all shadow-lg"
              >
                SIGN IN
              </button>
            </div>
          </div>
        </div>

        {/* --- FORMS (STATIC UNDERLAY) --- */}
        
        {/* Register Form (Underneath the Left Side) */}
        <div className="w-1/2 h-full p-16 flex flex-col justify-center items-center z-10">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex items-center gap-3 text-2xl font-bold tracking-tighter" style={{ color: brandBlue }}>
              <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain bg-white rounded-xl p-1 shadow-md border border-slate-100" />
              NexusChat
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900">Create Account</h1>
            <div className="flex gap-4 py-2">
              {socialIcons.map(item => (
                <button key={item.name} type="button" className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition">{item.icon}</button>
              ))}
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Full Name" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-blue-500" />
              <input type="email" placeholder="Email Address" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-blue-500" />
              <input type="password" placeholder="Password" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-blue-500" />
            </div>
            <button style={{ backgroundColor: brandBlue }} className="w-full text-white font-bold py-4 rounded-xl shadow-lg mt-4 hover:brightness-110 transition-all">SIGN UP</button>
          </div>
        </div>

        {/* Sign In Form (Underneath the Right Side) */}
        <div className="w-1/2 h-full p-16 flex flex-col justify-center items-center z-10">
  <div className="w-full max-w-sm space-y-6">
    {/* ... Logo section ... */}
    <h1 className="text-4xl font-extrabold text-slate-900">Sign In</h1>
    
    {/* 1. Add onSubmit here */}
    <form className="space-y-3" onSubmit={handleSignIn}> 
      <div className="flex gap-4 py-2">
        {/* ... Social icons ... */}
      </div>
      <div className="space-y-3">
        <input required type="email" placeholder="Email Address" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-blue-500" />
        <input required type="password" placeholder="Password" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-blue-500" />
      </div>
      <button type="button" className="text-sm font-medium hover:underline block text-right w-full" style={{ color: brandBlue }}>Forgot your password?</button>
      
      {/* 2. Change to type="submit" */}
      <button 
        type="submit" 
        style={{ backgroundColor: brandBlue }} 
        className="w-full text-white font-bold py-4 rounded-xl shadow-lg mt-4 hover:brightness-110 transition-all"
      >
        SIGN IN
      </button>
    </form>
  </div>
</div>

      </div>
    </div>
  );
};

export default AuthPage;