import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  MessageSquare,
  Phone,
  Users,
  Sun,
  Moon,
  Settings,
  Send,
  Search,
  Video,
  MoreVertical,
  Plus,
  Mic,
  CheckCheck,
  LogOut,
  UserPlus,
} from 'lucide-react';
import {
  fetchAllUsers,
  fetchUserChats,
  getMessages,
  createOrGetChat,
  sendMessage,
  logoutUser as apiLogout,
  createAGroupChat,
} from '../api';
import { ChatEventEnum } from '../constants';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false); // Requirement #4: Menu Toggle
  const socket = useSocket();
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    [],
  );

  const navigate = useNavigate();

  // Requirement #2: CSS to hide scrollbars
  const scrollbarHideStyle = {
    msOverflowStyle: 'none',
    scrollbarWidth: 'none',
  } as React.CSSProperties;

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

useEffect(() => {
  const loadData = async () => {
    try {
      // 🚩 CHANGE: Fetch EVERYONE so you can start new chats
      const usersRes = await fetchAllUsers(); 
      setAvailableUsers(usersRes.data.data);
    } catch (err) {
      console.error('Initialization error', err);
    }
  };
  loadData();
}, []);

  useEffect(() => {
    if (selectedChat) {
      const loadMessages = async () => {
        try {
          const res = await getMessages(selectedChat._id);
          setMessages(res.data.data);
          socket?.emit(ChatEventEnum.JOIN_CHAT_EVENT, selectedChat._id);
        } catch (err) {
          console.error('Message load failed', err);
        }
      };
      loadMessages();
    }
  }, [selectedChat, socket]);

  // Requirement #1: Fixed Live Message Updates
  useEffect(() => {
  if (!socket) return;

  const handleIncomingMessage = (newMsg: any) => {
    // 🚩 FIX 1: Support multiple backend formats (chatId vs chat._id)
    const incomingChatId = newMsg.chatId || newMsg.chat?._id || newMsg.chat;

    // 🚩 FIX 2: Use a functional update for setMessages
    // This ensures we always have the freshest 'prev' state
    setMessages((prev) => {
      // Check if the message is actually for the chat we are looking at
      // We use the ID from the scope of the latest selectedChat
      if (selectedChat?._id === incomingChatId) {
        const isAlreadyPresent = prev.some((m) => m._id === newMsg._id);
        if (isAlreadyPresent) return prev;
        return [...prev, newMsg];
      }
      return prev;
    });

    // 🚩 FIX 3: Update the sidebar preview even if chat isn't open
    setAvailableUsers((prev) => 
      prev.map(u => u._id === incomingChatId ? { ...u, lastMessage: newMsg } : u)
    );
  };

  socket.on(ChatEventEnum.MESSAGE_RECEIVED_EVENT, handleIncomingMessage);

  return () => {
    socket.off(ChatEventEnum.MESSAGE_RECEIVED_EVENT, handleIncomingMessage);
  };
}, [socket, selectedChat?._id]); // Add selectedChat._id to the dependency array

  // Requirement #3: Online/Typing logic
  useEffect(() => {
    if (!socket) return;

    socket.on(ChatEventEnum.TYPING_EVENT, (chatId: string) => {
      if (selectedChat?._id === chatId) setIsTyping(true);
    });

    socket.on(ChatEventEnum.STOP_TYPING_EVENT, (chatId: string) => {
      if (selectedChat?._id === chatId) setIsTyping(false);
    });

    socket.on('USER_ONLINE_STATUS', ({ userId, isOnline }: any) => {
      setOnlineUsers((prev) =>
        isOnline
          ? [...new Set([...prev, userId])]
          : prev.filter((id) => id !== userId),
      );
    });

    return () => {
      socket.off(ChatEventEnum.TYPING_EVENT);
      socket.off(ChatEventEnum.STOP_TYPING_EVENT);
      socket.off('USER_ONLINE_STATUS');
    };
  }, [socket, selectedChat?._id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogout = async () => {
    try {
      // 1. Close the menu
      setShowMenu(false);

      // 2. Call the backend to clear cookies and unset refreshToken
      await apiLogout();

      // 3. Clear the user from LocalStorage (Frontend cleanup)
      localStorage.removeItem('user');

      // 4. Disconnect the socket so the user shows as "Offline" immediately
      socket?.disconnect();

      // 5. Redirect to Auth/Login page
      navigate('/register'); // Adjust path to your login route
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleCreateGroup = async () => {
  if (!groupName || selectedParticipants.length < 2) return;

  try {
    const response = await createAGroupChat({
      chatName: groupName, // 🚩 Change 'name' to 'chatName' here
      participants: selectedParticipants,
      description: "Created in NexusChat"
    });

    const newGroup = response.data.data;

    // Update UI and Close Modal
    setAvailableUsers((prev) => [newGroup, ...prev]);
    setSelectedChat(newGroup);
    setIsGroupModalOpen(false);
    
    // Clear the modal form
    setGroupName("");
    setSelectedParticipants([]);
    
  } catch (err) {
    console.error("Group creation failed:", err);
  }
};

  const openUserChat = async (userId: string) => {
    try {
      const response = await createOrGetChat(userId);
      setSelectedChat(response.data.data);
      setSearchTerm('');
    } catch (err) {
      console.error('Could not open chat', err);
    }
  };

const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!typedMessage.trim() || !selectedChat) return;

  const messageContent = typedMessage;
  setTypedMessage('');

  try {
    socket?.emit(ChatEventEnum.STOP_TYPING_EVENT, selectedChat._id);
    const response = await sendMessage(selectedChat._id, messageContent);
    
    // 🚩 IMPORTANT: Only update local state if the socket listener 
    // isn't already handling the 'message received' for the sender.
    // If your backend emits MESSAGE_RECEIVED_EVENT to the sender too, 
    // remove the line below to prevent duplicates.
    setMessages((prev) => [...prev, response.data.data]);
    
  } catch (error) {
    console.error('Failed to send:', error);
  }
};

  const getOtherUser = (chat: any) => {
    if (!chat || !chat.participants) return null;
    const me = JSON.parse(localStorage.getItem('user') || '{}');
    const other = chat.participants.find((p: any) => p.user._id !== me._id);
    return other?.user;
  };

// Find this function in your code and replace it
const getChatDisplayInfo = (chat: any) => {
  if (!chat) return { name: "Chat", initial: "?" };

  // 1. If it's a group, use the group name
  if (chat.isGroupChat) {
    return { 
      name: chat.chatName, 
      initial: chat.chatName?.[0]?.toUpperCase() || "G" 
    };
  }

  // 2. If it's private, find the OTHER person's name
  const me = JSON.parse(localStorage.getItem('user') || '{}');
  const otherParticipant = chat.participants?.find(
    (p: any) => p.user._id !== me._id
  );
  
  const otherUser = otherParticipant?.user;
  return {
    name: otherUser?.fullName || "User",
    initial: otherUser?.fullName?.[0]?.toUpperCase() || "?",
    id: otherUser?._id
  };
};


  const otherUser = getOtherUser(selectedChat);
  const isUserOnline = onlineUsers.includes(otherUser?._id);

  return (
    <div
      className={`flex h-screen font-sans overflow-hidden transition-colors duration-500 ${theme.bgMain} ${theme.textMain}`}
    >
      <aside
        className={`w-[68px] ${theme.bgSidebar} border-r ${theme.border} flex flex-col items-center py-4 justify-between h-screen`}
      >
        <div className="flex flex-col items-center w-full space-y-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500 mb-4 cursor-pointer">
            <img
              src="/2.png"
              alt="Profile"
              className="w-full h-full bg-white p-1"
            />
          </div>
          <SidebarIcon
            icon={<MessageSquare size={22} />}
            active
            isDarkMode={isDarkMode}
          />
          <SidebarIcon icon={<Users size={22} />} isDarkMode={isDarkMode} />
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2.5 rounded-xl ${isDarkMode ? 'text-amber-400' : 'text-blue-600'}`}
          >
            {isDarkMode ? (
              <Moon size={22} fill="currentColor" />
            ) : (
              <Sun size={22} fill="currentColor" />
            )}
          </button>
        </div>
        <div className="mb-2">
          <SidebarIcon icon={<Settings size={22} />} isDarkMode={isDarkMode} />
        </div>
      </aside>

      <section
        className={`w-80 border-r ${theme.border} flex flex-col h-screen`}
      >
        <div className="p-6 pb-2">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Chats</h1>
            <div className="flex items-center gap-3">
              <div className="relative">
                <MoreVertical
                  size={20}
                  className="cursor-pointer opacity-60 hover:opacity-100"
                  onClick={() => setShowMenu(!showMenu)}
                />
                {showMenu && (
                  <div
                    className={`absolute right-0 mt-2 w-48 rounded-xl shadow-2xl py-2 z-50 border ${theme.border} ${isDarkMode ? 'bg-[#233138]' : 'bg-white'}`}
                  >
                    <button
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-white/5"
                      onClick={() => {
                        setIsGroupModalOpen(true);
                        setShowMenu(false);
                      }}
                    >
                      <Users size={16} /> New group
                    </button>
                    <button
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                        isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-100'
                      }`}
                      onClick={handleLogout}
                    >
                      <LogOut size={16} />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div
            className={`flex items-center gap-2 mb-4 ${isDarkMode ? 'bg-black/20' : 'bg-slate-100'} p-3 rounded-xl border ${theme.border}`}
          >
            <Search size={18} className="opacity-40" />
            <input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto px-2 space-y-1 no-scrollbar"
          style={scrollbarHideStyle}
        >
          {availableUsers
            .filter((u) => {
              const displayName = u.fullName || u.chatName || "";
              return displayName.toLowerCase().includes(searchTerm.toLowerCase());
            })
            .map((user) => {
              const isActive = selectedChat?._id === user._id;
              const isLiveOnline = onlineUsers.includes(user._id);
              // Safe Initials for sidebar
              const initial = (user.fullName || user.chatName || "?")[0].toUpperCase();

              return (
                <div
                  key={user._id}
                  onClick={() => openUserChat(user._id)}
                  className={`p-4 rounded-2xl cursor-pointer flex gap-4 transition-all ${isActive ? theme.bgCardActive : 'hover:bg-white/5'}`}
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ${user.isGroupChat ? 'bg-indigo-600' : 'bg-blue-600'}`}>
                      {user.isGroupChat ? <Users size={20} /> : initial}
                    </div>
                    {!user.isGroupChat && isLiveOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0f172a]"></div>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-start">
                      <h4 className={`font-bold text-sm truncate ${isActive ? 'text-blue-500' : ''}`}>
                        {user.fullName || user.chatName}
                      </h4>
                      {!user.isGroupChat && (
                        <span className="text-[10px] opacity-30">
                          {isLiveOnline ? 'Online' : 'Offline'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs truncate opacity-60">
                      {user.isGroupChat ? user.description : `@${user.username}`}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      <main className={`flex-1 flex flex-col ${theme.bgChat} relative`}>
        {selectedChat ? (
          <>
            <header className={`px-8 py-4 bg-transparent border-b ${theme.border} flex justify-between items-center z-10 shadow-sm`}>
             <div className="flex items-center gap-4">
    {/* Avatar Fix */}
    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${selectedChat.isGroupChat ? 'bg-indigo-600' : 'bg-blue-600'}`}>
      {getChatDisplayInfo(selectedChat).initial}
    </div>
    
    <div className="flex flex-col">
      {/* 🚩 NAME FIX: Use the helper here */}
      <h3 className="font-bold text-slate-100">
        {getChatDisplayInfo(selectedChat).name}
      </h3>
      
      {isTyping ? (
        <span className="text-xs text-green-400 animate-pulse">typing...</span>
      ) : !selectedChat.isGroupChat ? (
        <span className={`text-xs ${isUserOnline ? 'text-green-500' : 'text-slate-500'}`}>
          {isUserOnline ? 'Online' : 'Offline'}
        </span>
      ) : (
        <span className="text-xs text-slate-500">{selectedChat.participants.length} members</span>
      )}
    </div>
  </div>
            </header>

            <div
              className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar"
              style={scrollbarHideStyle}
            >
              {messages.map((msg) => {
                const me = JSON.parse(localStorage.getItem('user') || '{}');
                const isMe = msg.senderId === me._id || msg.sender?._id === me._id;
                return (
                  <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${isMe ? `${theme.bubbleMe} text-white rounded-tr-none shadow-blue-500/10` : `${theme.bubbleThem} ${theme.border} ${theme.textMain} rounded-tl-none`}`}>
                      {/* Show sender name in group chats */}
                      {selectedChat.isGroupChat && !isMe && (
                        <p className="text-[10px] font-bold text-blue-400 mb-1">{msg.sender?.fullName || 'Member'}</p>
                      )}
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
                  value={typedMessage}
                  onChange={(e) => {
                    setTypedMessage(e.target.value);
                    socket?.emit(ChatEventEnum.TYPING_EVENT, selectedChat?._id);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                      socket?.emit(ChatEventEnum.STOP_TYPING_EVENT, selectedChat?._id);
                    }, 2000);
                  }}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-white px-2"
                  placeholder="Type a message..."
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

      {/* --- NEW GROUP MODAL --- */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`${theme.bgSidebar} w-full max-w-md rounded-3xl border ${theme.border} shadow-2xl overflow-hidden`}>
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Create New Group</h2>
              <button onClick={() => setIsGroupModalOpen(false)} className="opacity-50 hover:opacity-100 text-xl transition-opacity">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block ml-1">Group Name</label>
                <input 
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 outline-none focus:border-blue-500 transition-all text-sm text-white"
                  placeholder="e.g. MSIT Developers 🚀"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block ml-1">Select Participants ({selectedParticipants.length})</label>
                <div className="max-h-52 overflow-y-auto space-y-1 no-scrollbar pr-1">
                  {availableUsers.filter(u => !u.isGroupChat).map((user) => {
                    const isSelected = selectedParticipants.includes(user._id);
                    const displayName = user.fullName || user.username || "Unknown User";
                    const initial = displayName[0]?.toUpperCase() || "?";
                    return (
                      <div key={user._id} onClick={() => setSelectedParticipants(prev => prev.includes(user._id) ? prev.filter(id => id !== user._id) : [...prev, user._id])}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-white/5 border border-transparent'}`}>
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">{initial}</div>
                        <div className="flex-1 flex flex-col overflow-hidden">
                          <span className="text-sm font-medium text-slate-100 truncate">{displayName}</span>
                          <span className="text-[10px] opacity-40 truncate">@{user.username}</span>
                        </div>
                        {isSelected && <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"></div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-6 bg-black/10 flex gap-3">
              <button onClick={() => { setIsGroupModalOpen(false); setGroupName(""); setSelectedParticipants([]); }} className="flex-1 py-3 rounded-xl font-bold opacity-50 hover:opacity-100 text-sm transition-all">Cancel</button>
              <button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedParticipants.length < 2}
                className={`flex-1 py-3 rounded-xl font-bold shadow-lg transition-all text-sm ${!groupName.trim() || selectedParticipants.length < 2 ? 'bg-blue-600/20 text-white/20 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'}`}>
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SidebarIcon = ({ icon, active }: any) => (
  <div
    className={`p-2.5 rounded-xl cursor-pointer transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/10'}`}
  >
    {icon}
  </div>
);

export default Dashboard;
