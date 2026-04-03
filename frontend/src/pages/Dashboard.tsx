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
  ChevronDown,
  Trash2,
  MoreVertical,
  Plus,
  Ban,
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
  deleteMessage,
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

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isNewChatView, setIsNewChatView] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]); // To store everyone for searching
  const [recentChats, setRecentChats] = useState<any[]>([]); // To store history

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
        // 1. Fetch history for the default view
        const chatsRes = await fetchUserChats();
        console.log('CHATS FROM SERVER:', chatsRes.data);
        setRecentChats(chatsRes.data.data);

        // 2. Fetch all users so we can find new people to talk to
        const usersRes = await fetchAllUsers();
        setAllUsers(usersRes.data.data);
      } catch (err) {
        console.error('Initialization error', err);
      }
    };
    loadData();
  }, []);

  // Requirement: Handle being added to a new group or starting a new chat
  useEffect(() => {
    if (!socket) return;

    const handleNewChat = (newChat: any) => {
      setRecentChats((prev) => {
        // Prevent duplicates if the user is already looking at the list
        if (prev.find((chat) => chat._id === newChat._id)) return prev;

        // Add the new group to the top of the sidebar
        return [newChat, ...prev];
      });
    };

    socket.on(ChatEventEnum.NEW_CHAT_EVENT, handleNewChat);

    return () => {
      socket.off(ChatEventEnum.NEW_CHAT_EVENT, handleNewChat);
    };
  }, [socket]);

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

  useEffect(() => {
  if (!socket) return;

  // 🟢 LISTEN for the delete event from the server
  const onMessageDeleted = (messageId: string) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg._id === messageId 
          ? { ...msg, isDeleted: true, content: "This message was deleted" } 
          : msg
      )
    );
  };

  socket.on(ChatEventEnum.MESSAGE_DELETE_EVENT, onMessageDeleted);

  // 🚩 CLEANUP: Remove the listener when the component unmounts
  return () => {
    socket.off(ChatEventEnum.MESSAGE_DELETE_EVENT, onMessageDeleted);
  };
}, [socket, setMessages]);

  // Requirement #1: Fixed Live Message Updates
  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (newMsg: any) => {
      const incomingChatId = newMsg.chatId || newMsg.chat?._id || newMsg.chat;

      // 1. Update messages if chat is open
      setMessages((prev) => {
        if (selectedChat?._id === incomingChatId) {
          const isAlreadyPresent = prev.some((m) => m._id === newMsg._id);
          return isAlreadyPresent ? prev : [...prev, newMsg];
        }
        return prev;
      });

      // 🚩 2. Update Sidebar for Receiver
      setRecentChats((prev) => {
        const chatIndex = prev.findIndex((c) => c._id === incomingChatId);

        if (chatIndex !== -1) {
          const updatedChat = {
            ...prev[chatIndex],
            latestMessage: newMsg, // Update the preview text
            updatedAt: new Date().toISOString(), // Trigger re-sort to top
          };
          const otherChats = prev.filter((_, index) => index !== chatIndex);
          return [updatedChat, ...otherChats];
        } else {
          // OPTIONAL: If chat doesn't exist in sidebar (first message from stranger)
          // You might want to trigger a small re-fetch of chats here
          return prev;
        }
      });
    };

    socket.on(ChatEventEnum.MESSAGE_RECEIVED_EVENT, handleIncomingMessage);
    return () => {
      socket.off(ChatEventEnum.MESSAGE_RECEIVED_EVENT, handleIncomingMessage);
    };
  }, [socket, selectedChat?._id]); // Ensure listener captures current chat state

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
        chatName: groupName,
        participants: selectedParticipants,
        description: 'Created in NexusChat',
      });

      const newGroup = response.data.data;

      // 🚩 FIX: Update 'recentChats' instead of 'availableUsers'
      setRecentChats((prev) => [newGroup, ...prev]);
      setSelectedChat(newGroup);
      setIsGroupModalOpen(false);

      setGroupName('');
      setSelectedParticipants([]);
    } catch (err) {
      console.error('Group creation failed:', err);
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
    const chatId = selectedChat._id; // Store ID before clearing
    setTypedMessage('');

    try {
      socket?.emit(ChatEventEnum.STOP_TYPING_EVENT, chatId);
      const response = await sendMessage(chatId, messageContent);
      const newMessage = response.data.data;

      // 1. Update the chat window
      setMessages((prev) => [...prev, newMessage]);

      // 🚩 2. Update the sidebar for the sender
      setRecentChats((prev) => {
        const chatIndex = prev.findIndex((c) => c._id === chatId);
        if (chatIndex !== -1) {
          const updatedChat = {
            ...prev[chatIndex],
            latestMessage: newMessage,
            updatedAt: new Date().toISOString(), // Force move to top
          };
          const otherChats = prev.filter((_, index) => index !== chatIndex);
          return [updatedChat, ...otherChats];
        }
        return prev;
      });
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
    if (!chat) return { name: 'Unknown', initial: '?' };

    // Handle Group Chats
    if (chat.isGroupChat) {
      const name = chat.chatName || 'Unnamed Group';
      return { name, initial: name[0].toUpperCase() };
    }

    // Handle Private Chats
    try {
      const me = JSON.parse(localStorage.getItem('user') || '{}');
      const other = chat.participants?.find((p: any) => {
        const pId = p.user?._id || p.user; // Handle populated vs non-populated
        return String(pId) !== String(me._id);
      });

      const displayName =
        other?.user?.fullName || other?.user?.username || 'Nexus User';
      return {
        name: displayName,
        initial: displayName[0]?.toUpperCase() || '?',
        id: other?.user?._id || other?.user,
      };
    } catch (err) {
      return { name: 'User', initial: 'U' };
    }
  };

  const otherUser = getOtherUser(selectedChat);
  const isUserOnline = onlineUsers.includes(otherUser?._id);

 const handleDeleteMessage = async (messageId: string, type: 'me' | 'everyone') => {
  try {
    // 🚩 CHECK THIS LINE: Are you passing 'type' as the 3rd argument?
    await deleteMessage(selectedChat._id, messageId, type);
    
    // If it's only for me, remove it from the local list immediately
    if (type === 'me') {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    }
    
    setOpenMenuId(null);
  } catch (error) {
    console.error("Delete failed", error);
  }
};
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
            <h1 className="text-2xl font-bold tracking-tight">
              {isNewChatView ? 'New chat' : 'Chats'}
            </h1>

            <div className="flex items-center gap-2">
              {/* 🚩 The "New Chat" Icon Button */}
              <button
                onClick={() => setIsNewChatView(!isNewChatView)}
                className={`p-2 rounded-full transition-all duration-200 ${
                  isNewChatView
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <UserPlus size={22} />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 text-slate-400 hover:bg-white/10 hover:text-white rounded-full transition-all"
                >
                  <MoreVertical size={22} />
                </button>
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
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-white/5"
                      onClick={handleLogout}
                    >
                      <LogOut size={16} /> Log out
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
              placeholder={
                isNewChatView ? 'Search name or number' : 'Search users...'
              }
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
          {/* 🚩 NEW GROUP BUTTON: Appears only in the "New Chat" discovery view */}
          {isNewChatView && (
            <div
              onClick={() => {
                setIsGroupModalOpen(true);
                setIsNewChatView(false);
              }}
              className="p-4 rounded-2xl cursor-pointer flex gap-4 hover:bg-white/5 transition-all mb-2 border-b border-white/5"
            >
              <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white shadow-lg">
                <Users size={22} />
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="font-bold text-sm text-green-500">New group</h4>
              </div>
            </div>
          )}

          {/* 🚩 LIST RENDERING */}
          {(isNewChatView || searchTerm ? allUsers : recentChats)
            .filter((item) => {
              const info = getChatDisplayInfo(item);
              const matchesSearch = info.name
                .toLowerCase()
                .includes(searchTerm.toLowerCase());

              // 🚩 NEW LOGIC: Hide empty 1-on-1 chats in the "Recent" view
              if (!isNewChatView && !searchTerm) {
                // If it's NOT a group chat AND it has NO latest message, hide it
                if (!item.isGroupChat && !item.latestMessage) {
                  return false;
                }
              }

              return matchesSearch;
            })
            .sort((a, b) => {
              if (isNewChatView)
                return (a.fullName || '').localeCompare(b.fullName || '');
              const timeA = new Date(a.updatedAt || 0).getTime();
              const timeB = new Date(b.updatedAt || 0).getTime();
              return timeB - timeA;
            })
            .map((item) => {
              const isActive = selectedChat?._id === item._id;
              const info = getChatDisplayInfo(item);

              // 🟢 LOGIC FIX: In New Chat view, 'item' is the User object.
              // We use item.fullName directly to avoid the "Nexus User" fallback.
              const displayName = isNewChatView ? item.fullName : info.name;
              const displayInitial = (displayName || '?')
                .charAt(0)
                .toUpperCase();

              const isLiveOnline =
                !item.isGroupChat && onlineUsers.includes(info.id || '');

              return (
                <div
                  key={item._id}
                  onClick={() => {
                    if (item.participants || item.isGroupChat) {
                      setSelectedChat(item);
                    } else {
                      openUserChat(item._id);
                    }
                    setIsNewChatView(false);
                  }}
                  className={`p-4 rounded-2xl cursor-pointer flex gap-4 transition-all ${
                    isActive ? theme.bgCardActive : 'hover:bg-white/5'
                  }`}
                >
                  {/* Avatar Section */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold bg-blue-600 shadow-inner">
                      {displayInitial}
                    </div>

                    {isLiveOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0f172a] rounded-full"></div>
                    )}
                  </div>

                  {/* Text Section */}
                  <div className="flex-1 flex flex-col justify-center overflow-hidden">
  <div className="flex justify-between items-baseline">
    <h4 className="font-bold text-sm truncate">
      {displayName}
    </h4>
    
    {/* 🚩 Show time only if not in "New Chat" view */}
    {!isNewChatView && item.latestMessage && (
      <span className="text-[10px] opacity-40 ml-2">
        {new Date(item.latestMessage.createdAt).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })}
      </span>
    )}
  </div>

  <p className="text-xs opacity-60 truncate">
    {isNewChatView ? (
      // If searching for new users, show the @username
      `@${item.username || item.handle || displayName.toLowerCase().replace(/\s+/g, '_')}`
    ) : (
      // If in recent chats, show the actual message content
      <>
        {item.latestMessage ? (
          <span>
            {/* If it's a group, show the sender name: */}
            {item.isGroupChat && `${item.latestMessage.sender.fullName.split(' ')[0]}: `}
            {/* Show message text or a placeholder for media */}
            {item.latestMessage.text || (item.latestMessage.image ? "📷 Photo" : "File")}
          </span>
        ) : (
          "Tap to start chatting"
        )}
      </>
    )}
  </p>
</div>
                </div>
              );
            })}

          {!searchTerm && !isNewChatView && recentChats.length === 0 && (
            <div className="mt-10 text-center px-6 opacity-40">
              <p className="text-xs leading-relaxed">
                No recent chats yet.
                <br />
                Click the + icon to find your first contact!
              </p>
            </div>
          )}
        </div>
      </section>

      <main className={`flex-1 flex flex-col ${theme.bgChat} relative`}>
        {selectedChat ? (
          <>
            <header
              className={`px-8 py-4 bg-transparent border-b ${theme.border} flex justify-between items-center z-10 shadow-sm`}
            >
              <div className="flex items-center gap-4">
                {/* Avatar Fix */}
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${selectedChat.isGroupChat ? 'bg-indigo-600' : 'bg-blue-600'}`}
                >
                  {getChatDisplayInfo(selectedChat).initial}
                </div>

                <div className="flex flex-col">
                  {/* 🚩 NAME FIX: Use the helper here */}
                  <h3 className="font-bold text-slate-100">
                    {getChatDisplayInfo(selectedChat).name}
                  </h3>

                  {isTyping ? (
                    <span className="text-xs text-green-400 animate-pulse">
                      typing...
                    </span>
                  ) : !selectedChat.isGroupChat ? (
                    <span
                      className={`text-xs ${isUserOnline ? 'text-green-500' : 'text-slate-500'}`}
                    >
                      {isUserOnline ? 'Online' : 'Offline'}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">
                      {selectedChat.participants.length} members
                    </span>
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
  const isMenuOpen = openMenuId === msg._id;
  const isDeleted = msg.isDeleted;

  return (
    <div
      key={msg._id}
      className={`flex group ${isMe ? 'justify-end' : 'justify-start'} relative mb-4 px-4`}
      onMouseLeave={() => setOpenMenuId(null)}
    >
      <div
        className={`relative max-w-[45%] p-3 rounded-2xl shadow-sm transition-all ${
          isMe 
            ? `${theme.bubbleMe} text-white rounded-tr-none shadow-blue-500/10` 
            : `${theme.bubbleThem} ${theme.border} ${theme.textMain} rounded-tl-none`
        }`}
      >
        {/* SENDER NAME (Groups) */}
        {selectedChat.isGroupChat && !isMe && (
          <p className="text-[11px] font-bold text-blue-400 mb-1 truncate">
            {msg.sender?.fullName || 'Member'}
          </p>
        )}

        {/* HOVER ARROW (Hide if message is deleted) */}
        {!isDeleted && (
          <div 
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10 p-1 rounded-full bg-black/10 hover:bg-black/20"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(isMenuOpen ? null : msg._id);
            }}
          >
            <ChevronDown size={14} />
          </div>
        )}

        {/* 🚩 MESSAGE CONTENT: Styled to match your reference image */}
        {isDeleted ? (
          <div className="flex items-center gap-2 py-1 pr-6 opacity-50">
            <Ban size={14} className="shrink-0" />
            <p className="text-[14px] italic leading-tight">
              This message was deleted
            </p>
          </div>
        ) : (
          <p className="text-[14.5px] leading-tight break-words whitespace-pre-wrap pr-4">
            {msg.content}
          </p>
        )}
        
        {/* TIME & STATUS */}
        <div className="flex items-center justify-end gap-1 opacity-60 mt-1">
          <span className="text-[10px]">
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMe && !isDeleted && (
            <CheckCheck size={14} className="text-blue-200" />
          )}
        </div>

        {/* DELETE DROPDOWN */}
        {isMenuOpen && (
          <div className={`absolute top-8 ${isMe ? 'right-0' : 'left-0'} z-50 w-40 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl p-1`}>
             <button 
              onClick={() => handleDeleteMessage(msg._id, 'me')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 rounded-lg"
            >
              <Trash2 size={13} /> Delete for me
            </button>
            {isMe && (
              <button 
                onClick={() => handleDeleteMessage(msg._id, 'everyone')}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg"
              >
                <Users size={13} /> Delete for everyone
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
})}
              <div ref={scrollRef} />
            </div>

            <footer className={`p-6 bg-transparent border-t ${theme.border}`}>
              <form
                onSubmit={handleSendMessage}
                className="bg-[#1e293b] rounded-2xl p-2 flex items-center gap-3 border border-white/5"
              >
                <div className="p-2 text-blue-500 cursor-pointer hover:scale-110">
                  <Mic size={22} />
                </div>
                <input
                  value={typedMessage}
                  onChange={(e) => {
                    setTypedMessage(e.target.value);
                    socket?.emit(ChatEventEnum.TYPING_EVENT, selectedChat?._id);
                    if (typingTimeoutRef.current)
                      clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                      socket?.emit(
                        ChatEventEnum.STOP_TYPING_EVENT,
                        selectedChat?._id,
                      );
                    }, 2000);
                  }}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-white px-2"
                  placeholder="Type a message..."
                />
                <div className="p-2 text-slate-500 cursor-pointer hover:scale-110">
                  <Plus size={22} />
                </div>
                <button
                  type="submit"
                  className="p-3 bg-blue-600 rounded-full text-white shadow-lg hover:scale-105 transition-transform"
                >
                  <Send size={18} fill="currentColor" />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center opacity-20 flex-col">
            <MessageSquare size={100} />
            <p className="mt-4 text-xl font-bold tracking-tight text-center px-10">
              Select a contact from the sidebar to start a Nexus conversation
            </p>
          </div>
        )}
      </main>

      {/* --- NEW GROUP MODAL --- */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`${theme.bgSidebar} w-full max-w-md rounded-3xl border ${theme.border} shadow-2xl overflow-hidden`}
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Create New Group</h2>
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="opacity-50 hover:opacity-100 text-xl transition-opacity"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block ml-1">
                  Group Name
                </label>
                <input
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 outline-none focus:border-blue-500 transition-all text-sm text-white"
                  placeholder="e.g. MSIT Developers 🚀"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2 block ml-1">
                  Select Participants ({selectedParticipants.length})
                </label>
                <div className="max-h-52 overflow-y-auto space-y-1 no-scrollbar pr-1">
                  {allUsers
                    .filter((u) => !u.isGroupChat) // Groups can't join other groups!
                    .map((user) => {
                      const isSelected = selectedParticipants.includes(
                        user._id,
                      );
                      const displayName =
                        user.fullName || user.username || 'Unknown User';
                      const initial = displayName[0]?.toUpperCase() || '?';
                      return (
                        <div
                          key={user._id}
                          onClick={() =>
                            setSelectedParticipants((prev) =>
                              prev.includes(user._id)
                                ? prev.filter((id) => id !== user._id)
                                : [...prev, user._id],
                            )
                          }
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-white/5 border border-transparent'}`}
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                            {initial}
                          </div>
                          <div className="flex-1 flex flex-col overflow-hidden">
                            <span className="text-sm font-medium text-slate-100 truncate">
                              {displayName}
                            </span>
                            <span className="text-[10px] opacity-40 truncate">
                              @{user.username}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"></div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
            <div className="p-6 bg-black/10 flex gap-3">
              <button
                onClick={() => {
                  setIsGroupModalOpen(false);
                  setGroupName('');
                  setSelectedParticipants([]);
                }}
                className="flex-1 py-3 rounded-xl font-bold opacity-50 hover:opacity-100 text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedParticipants.length < 2}
                className={`flex-1 py-3 rounded-xl font-bold shadow-lg transition-all text-sm ${!groupName.trim() || selectedParticipants.length < 2 ? 'bg-blue-600/20 text-white/20 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'}`}
              >
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
