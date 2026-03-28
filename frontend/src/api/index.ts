import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:4000/api/v1', // Update with your server port
  withCredentials: true, // Crucial for sending/receiving cookies (Refresh tokens)
});

//the data parameter contains the {email and password},axios  will convert this automatically to the json format;
export const login = (data: any) => API.post('/users/login', data);

export const register = (data: any) => API.post('/users/register', data);

// 1. Fetch all users to start a NEW chat (The "Contact List")
export const fetchAllUsers = () => API.get('/users/all-users');

// 2. Fetch existing conversations (The "Inbox/Sidebar")
export const fetchUserChats = () => API.get("/chats", { withCredentials: true });

// Change this from .post('/chats', { receiverId }) 
// to a URL parameter based on your controller's req.params
// Ensure it is .post and the URL matches your backend route exactly
export const createOrGetChat = (receiverId: string) => API.post(`/chats/c/${receiverId}`);

// 4. Get messages for a specific chat (Your current code, just ensuring it matches)
export const getMessages = (chatId: string) => API.get(`/messages/${chatId}`);

export const sendMessage = (chatId: string, content: string) => 
  API.post(`/messages/${chatId}`, { content });

export const logoutUser = () => API.post('/users/logout', {}, { withCredentials: true });

export const createAGroupChat = (data: { 
  chatName: string; 
  participants: string[]; 
  description?: string 
}) => {
  return API.post("/chats/group", data, { withCredentials: true });
};

