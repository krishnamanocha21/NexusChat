import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { 
  MessageSquare, Phone, CircleDashed, Users, Archive, 
  Lock, Sun, Moon, Settings, Send, Search, Video, MoreVertical, Plus, Mic 
} from 'lucide-react';
import { fetchAllUsers, fetchUserChats, getMessages, createOrGetChat } from '../api';

const Dashboard: React.FC = () => {
  // --- State ---
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [typedMessage, setTypedMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);

  const socket = useSocket();
  const scrollRef = useRef<HTMLDivElement>(null);
  const brandBlue = '#2563eb';

  // --- Theme Palette ---
  const theme = {
    bgMain: isDarkMode ? 'bg-[#0f172a]' : 'bg-white',
    bgSidebar: isDarkMode ? 'bg-[#1e293b]' : 'bg-slate-50',
    bgChat: isDarkMode ? 'bg-[#020617]' : 'bg-slate-50/50',
    bgCardActive: isDarkMode ? 'bg-blue-600/20' : 'bg-blue-50',
    border: isDarkMode ? 'border-white/10' : 'border-slate-200',
    textMain: isDarkMode ? 'text-slate-100' : 'text-slate-800',
    textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    bubbleMe: isDarkMode ? 'bg-[#2563eb]' : 'bg-blue-600',
    bubbleThem: isDarkMode ? 'bg-[#1e293b]' : 'bg-white',
  };

  // --- Initialization ---
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetchAllUsers();
        setAvailableUsers(res.data.data);
      } catch (err) { console.error("Failed to load users", err); }
    };
    loadUsers();
  }, []);

  // --- Chat Selection & Messages ---
  useEffect(() => {
    if (selectedChat) {
      const loadMessages = async () => {
        const res = await getMessages(selectedChat._id);
        setMessages(res.data.data);
      };
      loadMessages();
      socket?.emit("join chat", selectedChat._id);
    }
  }, [selectedChat, socket]);

  // --- Real-time Listeners ---
  useEffect(() => {
    if (!socket) return;
    socket.on("message received", (newMsg: any) => {
      if (selectedChat?._id === newMsg.chat) {
        setMessages(prev => [...prev, newMsg]);
      }
    });
    return () => { socket.off("message received"); };
  }, [socket, selectedChat]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Handlers ---
  const startNewChat = async (userId: string) => {
  try {
    // 1. Call the API using the receiverId in the URL params
    const response = await createOrGetChat(userId);
    
    // 2. The backend returns the 'payload' (chat[0]) 
    const chatData = response.data.data;
    
    // 3. Update state - This will trigger the useEffect to fetch messages
    setSelectedChat(chatData);
    
    // 4. Clear search to show the active chat clearly
    setSearchTerm("");
  } catch (error) {
    console.error("Failed to open chat window", error);
  }
};

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !selectedChat) return;
    socket?.emit("new message", { content: typedMessage, chatId: selectedChat._id });
    setTypedMessage("");
  };

  const getOtherUser = (chat: any) => {
    const me = JSON.parse(localStorage.getItem('user') || '{}');
    return chat.participants.find((p: any) => p._id !== me._id);
  };

  

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-500 ${theme.bgMain} ${theme.textMain}`}>
      
      {/* COLUMN 1: ICON RAIL */}
      <aside className={`w-[68px] ${theme.bgSidebar} border-r ${theme.border} flex flex-col items-center py-4 justify-between h-screen`}>
        <div className="flex flex-col items-center w-full space-y-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500 mb-4">
            <img src="/2.png" alt="Profile" className="w-full h-full bg-white p-1" />
          </div>
          <SidebarIcon icon={<MessageSquare size={22} />} active isDarkMode={isDarkMode} />
          <SidebarIcon icon={<Users size={22} />} isDarkMode={isDarkMode} />
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2.5 rounded-xl ${isDarkMode ? 'text-amber-400' : 'text-blue-600'}`}>
            {isDarkMode ? <Moon size={22} fill="currentColor" /> : <Sun size={22} fill="currentColor" />}
          </button>
        </div>
        <div className="mb-2"><SidebarIcon icon={<Settings size={22} />} isDarkMode={isDarkMode} /></div>
      </aside>

      {/* COLUMN 2: MESSAGES / USER LIST */}
      <section className={`w-80 border-r ${theme.border} flex flex-col`}>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Messages</h1>
          <div className={`flex items-center gap-2 mb-6 ${isDarkMode ? 'bg-black/20' : 'bg-slate-100'} p-3 rounded-xl border ${theme.border}`}>
            <Search size={18} className="opacity-40" />
            <input 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent outline-none text-sm w-full" 
            />
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-180px)] custom-scrollbar">
            {availableUsers
              .filter(u => u.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(user => (
                <div 
                  key={user._id}
                  onClick={() => startNewChat(user._id)}
                  className={`p-4 rounded-2xl cursor-pointer flex gap-4 transition-all ${selectedChat?.participants.some((p:any) => p._id === user._id) ? theme.bgCardActive : 'hover:bg-white/5'}`}
                >
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                    {user.fullName[0].toUpperCase()}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between"><h4 className="font-bold text-sm truncate">{user.fullName}</h4><span className="text-[10px] opacity-40">Just now</span></div>
                    <p className="text-xs truncate opacity-60">@{user.username}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* COLUMN 3: CHAT AREA (Expanded) */}
      <main className={`flex-1 flex flex-col ${theme.bgChat} relative`}>
        {selectedChat ? (
          <>
            <header className={`px-8 py-4 bg-transparent border-b ${theme.border} flex justify-between items-center`}>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                  {getOtherUser(selectedChat)?.fullName[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-lg">{getOtherUser(selectedChat)?.fullName}</h2>
                  <p className="text-xs text-green-500">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-6 opacity-60">
                <Video size={20} className="cursor-pointer" />
                <Phone size={20} className="cursor-pointer" />
                <MoreVertical size={20} className="cursor-pointer" />
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {messages.map((msg) => {
                const isMe = msg.sender._id === JSON.parse(localStorage.getItem('user') || '{}')._id;
                return (
                  <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-md p-4 rounded-2xl ${isMe ? `${theme.bubbleMe} text-white rounded-tr-none` : `${theme.bubbleThem} ${theme.border} rounded-tl-none`}`}>
                      <p className="text-sm">{msg.content}</p>
                      <span className="text-[10px] opacity-50 block mt-2 text-right">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <footer className={`p-6 bg-transparent border-t ${theme.border}`}>
              <form onSubmit={handleSendMessage} className={`bg-[#1e293b] rounded-2xl p-2 flex items-center gap-3 border ${theme.border}`}>
                <div className="p-2 text-blue-500 cursor-pointer hover:scale-110 transition-transform"><Mic size={22} /></div>
                <input 
                  type="text" 
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  placeholder="Type a message..." 
                  className="flex-1 bg-transparent px-2 py-2 outline-none placeholder:opacity-40" 
                />
                <div className="p-2 text-slate-500 cursor-pointer hover:scale-110 transition-transform"><Plus size={22} /></div>
                <button type="submit" className="p-3 bg-blue-600 rounded-full text-white shadow-lg hover:scale-105 transition-transform">
                  <Send size={18} fill="currentColor" />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center opacity-20 flex-col">
            <MessageSquare size={100} /><p className="mt-4 text-xl font-bold">Select a profile to start chatting</p>
          </div>
        )}
      </main>
    </div>
  );
};

const SidebarIcon = ({ icon, active, isDarkMode }: any) => (
  <div className={`p-2.5 rounded-xl cursor-pointer transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10'}`}>
    {icon}
  </div>
);

export default Dashboard;