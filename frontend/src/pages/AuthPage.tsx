import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api'; // Ensure register is exported from your api file

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const brandBlue = '#2563eb';
  const brandLime = '#bef264';
  const logoUrl = '/2.png';

  const socialIcons = [
    { name: 'Facebook', icon: '📷' },
    { name: 'Google', icon: '🐦' },
    { name: 'LinkedIn', icon: '🎥' },
  ];

  // Logic for Sign In
  const handleSignIn = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    // Change 'email' to 'identifier' to match your controller
    const response = await login({ 
      identifier: email, 
      password: password 
    }); 
    
    // Check if response.status is 200 (or use your success flag)
    if (response.data.success) {
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
      // Store the tokens too if you aren't strictly using cookies!
      localStorage.setItem('accessToken', response.data.data.accessToken);
      
      navigate('/dashboard');
    }
  } catch (error: any) {
    console.error('Login failed', error);
    // Use the backend's specific error message if available
    alert(error.response?.data?.message || 'Invalid Credentials');
  } finally {
    setIsLoading(false);
  }
};

  // Logic for Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // PASS USERNAME HERE
      const response = await register({ fullName, username, email, password });
      if (response.data.success) {
        alert('Account created! Please Sign In.');
        setIsLoginMode(true);
      }
    } catch (error: any) {
      console.error('Registration failed', error);
      // Dynamic error message from backend (e.g., "User already exists")
      alert(error.response?.data?.message || 'Error creating account');
    } finally {
      setIsLoading(false);
    }
  };

  // Reusable Input Style
  const inputStyle =
    'w-full p-4 border rounded-xl bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all';

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 font-sans">
      <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl relative overflow-hidden h-[700px] flex">
        {/* --- BLUE SLIDING PANEL --- */}
        <div
          className={`absolute top-0 h-full w-1/2 text-white transition-all duration-700 ease-in-out z-30 flex items-center justify-center ${
            isLoginMode ? 'left-1/2' : 'left-0'
          }`}
          style={{ backgroundColor: brandBlue }}
        >
          <div className="space-y-8 p-12 text-center">
            {/* View shown when panel is on the LEFT (Invite to Login) */}
            <div
              className={`transition-all duration-700 ${isLoginMode ? 'opacity-0 scale-90 pointer-events-none absolute' : 'opacity-100 scale-100'}`}
            >
              <h2 className="text-5xl font-extrabold mb-4">Welcome Back!</h2>
              <p className="text-lg text-blue-100 mb-8 max-w-xs mx-auto">
                Stay connected by logging in with your credentials.
              </p>
              <button
                onClick={() => setIsLoginMode(true)}
                style={{ backgroundColor: brandLime }}
                className="text-black font-bold px-12 py-3 rounded-full hover:brightness-110 active:scale-95 transition-all shadow-lg"
              >
                SIGN UP
              </button>
            </div>

            {/* View shown when panel is on the RIGHT (Invite to Register) */}
            <div
              className={`transition-all duration-700 ${!isLoginMode ? 'opacity-0 scale-90 pointer-events-none absolute' : 'opacity-100 scale-100'}`}
            >
              <h2 className="text-5xl font-extrabold mb-4">Hey There!</h2>
              <p className="text-lg text-blue-100 mb-8 max-w-xs mx-auto">
                Don't have an account yet? Start your journey today.
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

        {/* Register Form (Left Side) */}
        <div className="w-1/2 h-full p-16 flex flex-col justify-center items-center z-10">
          <div className="w-full max-w-sm space-y-6">
            <div
              className="flex items-center gap-3 text-2xl font-bold tracking-tighter"
              style={{ color: brandBlue }}
            >
              <img
                src={logoUrl}
                alt="Logo"
                className="w-10 h-10 object-contain bg-white rounded-xl p-1 shadow-md border border-slate-100"
              />
              NexusChat
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900">
              Create Account
            </h1>
            <form className="space-y-3" onSubmit={handleSignUp}>
              <input
                required
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputStyle}
              />
              <input
                required
                type="text"
                name="username"
                placeholder="Username"
                value={username} // Bind to state
                onChange={(e) => setUsername(e.target.value)} // Update state
                className={inputStyle}
              />
              <input
                required
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputStyle}
              />
              <input
                required
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputStyle}
              />
              <button
                type="submit"
                disabled={isLoading}
                style={{ backgroundColor: brandBlue }}
                className="w-full text-white font-bold py-4 rounded-xl shadow-lg mt-4 hover:brightness-110 transition-all disabled:opacity-50"
              >
                {isLoading ? 'CREATING...' : 'SIGN UP'}
              </button>
            </form>
          </div>
        </div>

        {/* Sign In Form (Right Side) */}
        <div className="w-1/2 h-full p-16 flex flex-col justify-center items-center z-10">
          <div className="w-full max-w-sm space-y-6">
            <div
              className="flex items-center gap-3 text-2xl font-bold tracking-tighter"
              style={{ color: brandBlue }}
            >
              <img
                src={logoUrl}
                alt="Logo"
                className="w-10 h-10 object-contain bg-white rounded-xl p-1 shadow-md border border-slate-100"
              />
              NexusChat
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900">Sign In</h1>
            <form className="space-y-3" onSubmit={handleSignIn}>
              <input
                required
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputStyle}
              />
              <input
                required
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputStyle}
              />
              <button
                type="button"
                className="text-sm font-medium hover:underline block text-right w-full"
                style={{ color: brandBlue }}
              >
                Forgot your password?
              </button>
              <button
                type="submit"
                disabled={isLoading}
                style={{ backgroundColor: brandBlue }}
                className="w-full text-white font-bold py-4 rounded-xl shadow-lg mt-4 hover:brightness-110 transition-all disabled:opacity-50"
              >
                {isLoading ? 'LOADING...' : 'SIGN IN'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
