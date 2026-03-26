import React, { useState } from 'react';
import { 
  MessageSquare, 
  Phone, 
  CircleDashed, 
  Users, 
  Archive, 
  Lock, 
  Circle, 
  Image as ImageIcon, 
  Sun,
  Moon,
  Settings 
} from 'lucide-react';
// --- Reusable Data Structure ---
interface Message {
  id: number;
  text: string;
  sender: 'me' | 'them';
  time: string;
}

interface User {
  id: number;
  name: string;
  avatar: string;
  status: string;
  phone: string;
  about: string;
  lastMsg: string;
  lastTime: string;
  unread: number;
  chats: Message[];
}

const USERS_DATA: User[] = [
  {
    id: 1,
    name: 'Columbus Studio',
    avatar: 'https://i.pravatar.cc/150?u=columbus',
    status: '4 Online',
    phone: '+91 62392 32874',
    about: 'A digital agency creating fantastic works.',
    lastMsg: 'Bayu Aji is Typing...',
    lastTime: '08:40 AM',
    unread: 0,
    chats: [
      { id: 1, text: "Vote for the meeting guys, when's the best time?", sender: 'them', time: '06:35 AM' },
      { id: 2, text: "I think Thursday is better 😊", sender: 'them', time: '06:38 AM' },
      { id: 3, text: "Wait a minute, I'll check my schedule first", sender: 'me', time: '06:55 AM' },
    ]
  },
  {
    id: 2,
    name: 'Aulia Ajeng',
    avatar: 'https://i.pravatar.cc/150?u=aulia',
    status: 'Online',
    phone: '+62 812 3456 789',
    about: 'Loves photography and UI design.',
    lastMsg: 'See you later!',
    lastTime: '10:15 AM',
    unread: 3,
    chats: [
      { id: 1, text: "Hey! Did you finish the design?", sender: 'them', time: '09:00 AM' },
      { id: 2, text: "Almost done, just tweaking colors.", sender: 'me', time: '09:05 AM' },
      { id: 3, text: "Great! See you later!", sender: 'them', time: '10:15 AM' },
    ]
  },
  {
    id: 3,
    name: 'Bagus Pambudi',
    avatar: 'https://i.pravatar.cc/150?u=bagus',
    status: 'Offline',
    phone: '+62 857 2222 111',
    about: 'Backend Engineer | Coffee Lover',
    lastMsg: 'Nice idea bro, thanks',
    lastTime: 'Yesterday',
    unread: 0,
    chats: [
      { id: 1, text: "Check out the new API docs.", sender: 'them', time: '04:00 PM' },
      { id: 2, text: "Looks solid. Nice idea bro, thanks", sender: 'me', time: '04:20 PM' },
    ]
  },
  {
    id: 4,
    name: 'Laila Rohmah',
    avatar: 'https://i.pravatar.cc/150?u=laila',
    status: 'Online',
    phone: '+62 819 0000 999',
    about: 'Writing code and poetry.',
    lastMsg: 'Thanks for the cookies!',
    lastTime: '07:10 AM',
    unread: 1,
    chats: [
      { id: 1, text: "I left some cookies on your desk.", sender: 'them', time: '07:05 AM' },
      { id: 2, text: "Oh wow! Thanks for the cookies!", sender: 'me', time: '07:10 AM' },
    ]
  },
  {
    id: 5,
    name: 'Cemara Family',
    avatar: 'https://i.pravatar.cc/150?u=family',
    status: '5 Members',
    phone: 'Group Chat',
    about: 'Home is where the heart is.',
    lastMsg: 'Happy fasting 😊',
    lastTime: '12:00 PM',
    unread: 5,
    chats: [
      { id: 1, text: "What's for dinner?", sender: 'them', time: '11:30 AM' },
      { id: 2, text: "Happy fasting 😊", sender: 'them', time: '12:00 PM' },
    ]
  }
];

const Dashboard: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState(1);
  const [showProfile, setShowProfile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to Dark Blue theme
  
  const currentUser = USERS_DATA.find(u => u.id === selectedUserId) || USERS_DATA[0];

  const brandBlue = '#2563eb';
  const brandLime = '#bef264';

  // --- Dynamic Theme Palettes ---
  const theme = {
    bgMain: isDarkMode ? 'bg-[#0f172a]' : 'bg-white',           // Midnight Blue vs White
    bgSidebar: isDarkMode ? 'bg-[#1e293b]' : 'bg-slate-50',    // Slate Blue vs Off-white
    bgChat: isDarkMode ? 'bg-[#020617]' : 'bg-slate-50/50',    // Deepest Black-Blue vs Light Gray
    bgCardActive: isDarkMode ? 'bg-blue-600/20' : 'bg-blue-50', 
    border: isDarkMode ? 'border-white/10' : 'border-slate-200',
    textMain: isDarkMode ? 'text-slate-100' : 'text-slate-800',
    textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    bubbleMe: isDarkMode ? 'bg-blue-600' : 'bg-[#2563eb]',
    bubbleThem: isDarkMode ? 'bg-[#1e293b]' : 'bg-white',
  };

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-500 ${theme.bgMain} ${theme.textMain}`}>
      
      {/* COLUMN 1: SIDEBAR WITH THEME TOGGLE */}
      <aside className={`w-[68px] ${theme.bgSidebar} border-r ${theme.border} flex flex-col items-center py-4 justify-between h-screen transition-colors duration-500`}>
        <div className="flex flex-col items-center w-full space-y-3">
          {/* Logo */}
          <div className="mb-4">
             <img src="/2.png" alt="Logo" className="w-9 h-9 object-contain bg-white rounded-lg p-1" />
          </div>

          <SidebarIcon icon={<MessageSquare size={22} />} badge="32" active isDarkMode={isDarkMode} />
          <SidebarIcon icon={<Phone size={22} />} badge="1" badgeColor="bg-red-500" isDarkMode={isDarkMode} />
          <SidebarIcon icon={<CircleDashed size={22} />} hasDot isDarkMode={isDarkMode} />
          <SidebarIcon icon={<Users size={22} />} isDarkMode={isDarkMode} />
          
          <div className={`w-8 border-t ${theme.border} my-1`}></div>
          
          <SidebarIcon icon={<Archive size={22} />} badge="29" badgeColor="bg-slate-500" isDarkMode={isDarkMode} />
          <SidebarIcon icon={<Lock size={22} />} isDarkMode={isDarkMode} />
        </div>

        <div className="flex flex-col items-center w-full space-y-4 mb-2">
          {/* THEME TOGGLE BUTTON */}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2.5 rounded-xl transition-all duration-300 hover:scale-110 ${isDarkMode ? 'bg-amber-400/10 text-blue-600' : 'bg-blue-100  text-amber-400'}`}
          >
            {isDarkMode ? < Moon size={22} fill="currentColor" /> : <Sun size={22} fill="currentColor" />}
          </button>

          <div className={`w-8 border-t ${theme.border}`}></div>
          
          <button className={`p-2.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 ${theme.textMuted}`}><Settings size={22} /></button>
          
          {/* Profile Avatar */}
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-transparent hover:border-blue-500 cursor-pointer transition-all shadow-md">
            <img src="/2.png" alt="Profile" className="w-full h-full object-cover bg-white p-1" />
          </div>
        </div>
      </aside>

      {/* COLUMN 2: MESSAGE LIST */}
      <section className={`w-80 border-r ${theme.border} flex flex-col transition-colors duration-500`}>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Messages</h1>
          <div className="space-y-1">
            {USERS_DATA.map(user => (
              <div 
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className={`p-4 rounded-2xl cursor-pointer flex gap-4 transition-all ${selectedUserId === user.id ? theme.bgCardActive : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <div className="relative">
                  <img src={user.avatar} className="w-12 h-12 rounded-full border-2 border-transparent" alt={user.name} />
                  {user.status.includes('Online') && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0f172a]"></div>}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-start">
                    <h4 className={`font-bold text-sm truncate ${selectedUserId === user.id ? 'text-blue-500' : ''}`}>{user.name}</h4>
                    <span className="text-[10px] opacity-50">{user.lastTime}</span>
                  </div>
                  <p className={`text-xs truncate opacity-60`}>{user.lastMsg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COLUMN 3: CHAT WINDOW */}
      <main className={`flex-1 flex flex-col ${theme.bgChat} relative transition-colors duration-500`}>
        <header className={`px-8 py-4 bg-transparent border-b ${theme.border} flex justify-between items-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all`} onClick={() => setShowProfile(true)}>
          <div className="flex items-center gap-4">
            <img src={currentUser.avatar} className="w-12 h-12 rounded-full shadow-lg border border-white/10" alt={currentUser.name} />
            <div>
              <h2 className="font-bold text-lg">{currentUser.name}</h2>
              <p className={`text-xs ${theme.textMuted}`}>{currentUser.status}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 opacity-60">
             <span>📹</span><span>📞</span><span>🔍</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {currentUser.chats.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-md p-4 rounded-2xl shadow-sm ${msg.sender === 'me' ? `${theme.bubbleMe} text-white rounded-tr-none` : `${theme.bubbleThem} rounded-tl-none border ${theme.border}`}`}>
                <p className="text-sm">{msg.text}</p>
                <span className={`text-[10px] mt-2 block opacity-50`}>{msg.time} {msg.sender === 'me' && '✔✔'}</span>
              </div>
            </div>
          ))}
        </div>

        <footer className={`p-6 bg-transparent border-t ${theme.border}`}>
          <div className={`${theme.bgSidebar} rounded-2xl p-2 flex items-center gap-3 border ${theme.border}`}>
            <input type="text" placeholder="Type a message..." className="flex-1 bg-transparent px-4 py-2 outline-none placeholder:opacity-40" />
            <button style={{ backgroundColor: brandBlue }} className="p-3 rounded-xl text-white shadow-lg hover:scale-105 transition-transform">➤</button>
          </div>
        </footer>
      </main>

      {/* COLUMN 4: PROFILE PANEL */}
      <aside className={`${theme.bgSidebar} border-l ${theme.border} transition-all duration-500 ${showProfile ? 'w-80 opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}>
        <div className="w-80 p-8">
          <div className="flex justify-between items-center mb-8">
             <h3 className="font-bold">Contact info</h3>
             <button onClick={() => setShowProfile(false)} className="opacity-50 hover:opacity-100 text-xl transition-opacity">✕</button>
          </div>
          <div className="text-center mb-8">
             <img src={currentUser.avatar} className="w-32 h-32 rounded-full mx-auto shadow-2xl mb-4 border-4 border-white/5" alt={currentUser.name} />
             <h4 className="font-bold text-xl">{currentUser.name}</h4>
             <p className={`text-sm ${theme.textMuted}`}>{currentUser.phone}</p>
          </div>
          <div className="space-y-6">
            <div>
              <h5 className={`text-xs font-bold ${theme.textMuted} uppercase tracking-widest mb-2`}>About</h5>
              <p className="text-sm opacity-80">{currentUser.about}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

// --- Custom Sidebar Icon Component to handle Theme logic ---
const SidebarIcon = ({ icon, badge, badgeColor = "bg-[#25d366]", hasDot, active, isDarkMode }: any) => (
  <div className={`relative group p-2.5 rounded-xl cursor-pointer transition-all 
    ${active 
      ? (isDarkMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-blue-100 text-blue-600') 
      : (isDarkMode ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-200 text-slate-500')
    }`}
  >
    {icon}
    {badge && (
      <span className={`absolute -top-1 -right-1 ${badgeColor} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 ${isDarkMode ? 'border-[#1e293b]' : 'border-slate-50'}`}>
        {badge}
      </span>
    )}
    {hasDot && (
      <div className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#25d366] rounded-full border-2 ${isDarkMode ? 'border-[#1e293b]' : 'border-slate-50'}`}></div>
    )}
  </div>
);



export default Dashboard;
