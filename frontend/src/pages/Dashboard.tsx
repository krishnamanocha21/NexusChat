import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { 
  MessageSquare, Phone, CircleDashed, Users, Archive, 
  Lock, Sun, Moon, Settings, Send, Search, Video, MoreVertical, Plus, Mic, CheckCheck 
} from 'lucide-react';
import { fetchAllUsers, fetchUserChats, getMessages, createOrGetChat,sendMessage } from '../api';
import { ChatEventEnum } from '../constants';

const Dashboard: React.FC = () => {
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [typedMessage, setTypedMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  const socket = useSocket();
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Dynamic Theme ---
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

  // 1. Initial Load: Get all users
  useEffect(() => {
    const loadData = async () => {
      try {
        const usersRes = await fetchAllUsers();
        setAvailableUsers(usersRes.data.data);
      } catch (err) { console.error("Initialization error", err); }
    };
    loadData();
  }, []);

  // 2. Click Logic: Join the room and get history
  useEffect(() => {
    if (selectedChat) {
      const loadMessages = async () => {
        try {
          const res = await getMessages(selectedChat._id);
          setMessages(res.data.data);
          // Tell server we are looking at this chat
          socket?.emit(ChatEventEnum.JOIN_CHAT_EVENT, selectedChat._id);
        } catch (err) { console.error("Message load failed", err); }
      };
      loadMessages();
    }
  }, [selectedChat, socket]);

  // 3. Socket Listeners: Real-time updates
  useEffect(() => {
    if (!socket) return;

    // 🚩 UPDATED: Use MESSAGE_RECEIVED_EVENT enum
    const handleNewMessage = (newMsg: any) => {
      // Logic check: ensuring chatId matches the current view
      if (selectedChat?._id === newMsg.chatId) {
        setMessages((prev) => [...prev, newMsg]);
      }
    };

    socket.on(ChatEventEnum.MESSAGE_RECEIVED_EVENT, handleNewMessage);

    // 🚩 UPDATED: Typing listeners from your Enum
    socket.on(ChatEventEnum.TYPING_EVENT, () => setIsTyping(true));
    socket.on(ChatEventEnum.STOP_TYPING_EVENT, () => setIsTyping(false));

    return () => { 
      // Clean up using the same Enum keys
      socket.off(ChatEventEnum.MESSAGE_RECEIVED_EVENT, handleNewMessage);
      socket.off(ChatEventEnum.TYPING_EVENT);
      socket.off(ChatEventEnum.STOP_TYPING_EVENT);
    };
  }, [socket, selectedChat?._id]); // Using ._id for more stable dependency tracking

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Functions ---
  const openUserChat = async (userId: string) => {
    try {
      // createOrGetChat calls your backend /chats/c/:receiverId
      const response = await createOrGetChat(userId);
      setSelectedChat(response.data.data);
      setSearchTerm("");
    } catch (err) { console.error("Could not open chat", err); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!typedMessage.trim() || !selectedChat) return;

  const tempMessage = typedMessage;
  setTypedMessage(""); // Clear input immediately

  try {
    //🚩 OPTIONAL: Emit STOP_TYPING when message is sent
    socket?.emit(ChatEventEnum.STOP_TYPING_EVENT, selectedChat._id);
    const response = await sendMessage(selectedChat._id, tempMessage);
    
    // Manually add the new message to the local state so it pops up instantly
    const newMessage = response.data.data;
    setMessages((prev) => [...prev, newMessage]);

    // Optional: socket.emit("stop typing") logic here
  } catch (error) {
    console.error("Failed to send:", error);
  }
};

  // Fixed helper to handle your Aggregated Participant structure
  const getOtherUser = (chat: any) => {
    const me = JSON.parse(localStorage.getItem('user') || '{}');
    // In your aggregation, participants is an array of objects: { user: { _id, ... }, role }
    const other = chat.participants.find((p: any) => p.user._id !== me._id);
    return other?.user;
  };

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-500 ${theme.bgMain} ${theme.textMain}`}>
      
      {/* COLUMN 1: SIDEBAR RAIL */}
      <aside className={`w-[68px] ${theme.bgSidebar} border-r ${theme.border} flex flex-col items-center py-4 justify-between h-screen`}>
        <div className="flex flex-col items-center w-full space-y-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500 mb-4 cursor-pointer">
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

      {/* COLUMN 2: CONTACTS LIST */}
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
              .map(user => {
                const isActive = selectedChat?.participants.some((p: any) => p.user._id === user._id);
                return (
                  <div 
                    key={user._id}
                    onClick={() => openUserChat(user._id)}
                    className={`p-4 rounded-2xl cursor-pointer flex gap-4 transition-all ${isActive ? theme.bgCardActive : 'hover:bg-white/5'}`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {user.fullName[0].toUpperCase()}
                      </div>
                      {user.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0f172a]"></div>}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-start">
                        <h4 className={`font-bold text-sm truncate ${isActive ? 'text-blue-500' : ''}`}>{user.fullName}</h4>
                        <span className="text-[10px] opacity-30">Online</span>
                      </div>
                      <p className="text-xs truncate opacity-60">@{user.username}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {/* COLUMN 3: CHAT WINDOW */}
      <main className={`flex-1 flex flex-col ${theme.bgChat} relative`}>
        {selectedChat ? (
          <>
            <header className={`px-8 py-4 bg-transparent border-b ${theme.border} flex justify-between items-center z-10 shadow-sm`}>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                  {getOtherUser(selectedChat)?.fullName[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-lg">{getOtherUser(selectedChat)?.fullName}</h2>
                  <p className="text-xs text-green-500">{isTyping ? "Typing..." : "Online"}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 opacity-60">
                <Video size={20} className="cursor-pointer hover:opacity-100" />
                <Phone size={20} className="cursor-pointer hover:opacity-100" />
                <MoreVertical size={20} className="cursor-pointer hover:opacity-100" />
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
  {messages.map((msg) => {
    const me = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Check if I sent the message. 
    // Handle both raw ID (from save) and populated object (from history)
    const isMe = (msg.senderId === me._id) || (msg.sender?._id === me._id);

    return (
      <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${
          isMe 
            ? `${theme.bubbleMe} text-white rounded-tr-none shadow-blue-500/10` 
            : `${theme.bubbleThem} ${theme.border} ${theme.textMain} rounded-tl-none`
        }`}>
          <p className="text-[15px] leading-relaxed">{msg.content}</p>
          
          <div className="flex items-center justify-end gap-1.5 opacity-40 mt-1">
            <span className="text-[10px] font-medium">
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isMe && <CheckCheck size={14} className="text-blue-200" />}
          </div>
        </div>
      </div>
    );
  })}
  <div ref={scrollRef} />
</div>

            <footer className={`p-6 bg-transparent border-t ${theme.border}`}>
              <form onSubmit={handleSendMessage} className="bg-[#1e293b] rounded-2xl p-2 flex items-center gap-3 border border-white/5">
                <div className="p-2 text-blue-500 cursor-pointer hover:scale-110"><Mic size={22} /></div>
                <input 
                  type="text" 
                  value={typedMessage}
                  onChange={(e) => {
                    setTypedMessage(e.target.value);
                    // Emit typing signal
                    socket?.emit("typing", selectedChat._id);
                  }}
                  onBlur={() => socket?.emit("stop typing", selectedChat._id)}
                  placeholder="Type a message..." 
                  className="flex-1 bg-transparent px-2 py-2 outline-none text-white placeholder:opacity-40" 
                />
                <div className="p-2 text-slate-500 cursor-pointer hover:scale-110"><Plus size={22} /></div>
                <button type="submit" className="p-3 bg-blue-600 rounded-full text-white shadow-lg hover:scale-105 transition-transform">
                  <Send size={18} fill="currentColor" />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center opacity-20 flex-col">
            <MessageSquare size={100} />
            <p className="mt-4 text-xl font-bold tracking-tight text-center px-10">Select a contact from the sidebar to start a Nexus conversation</p>
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