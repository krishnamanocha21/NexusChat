//the cookie-parser doesnot work for the socket.io it is for the http request
import cookie from "cookie";
import jwt from "jsonwebtoken";
import { ChatEventEnum } from "../constants.js";
import {User} from "../models/user.model.js";
import {ApiError} from "../utils/ApiError.js";

/**
 * @description Logic to handle a user joining a specific chat room
 * //When you call mountJoinChatEvent(socket), you are essentially telling the server: "Hey, start listening to this specific phone line (the socket).
 *  If the person on the other end says 'joinChat', they will also send a piece of data. Capture that data and name it chatId"
 */
const mountJoinChatEvent = (socket) => {
    //The server starts listening for a specific signal from the frontend. When the user clicks on a chat in your React app, the frontend "emits" this event
    //the server adds that user's specific connection to a group named after that ID
  socket.on(ChatEventEnum.JOIN_CHAT_EVENT, (chatId) => {
    console.log(`User joined chat . chatId: ${chatId}`);
    socket.join(chatId);
  });
};

/**
 * @description Logic to handle typing indicators
 */
const mountTypingEvents = (socket) => {
  socket.on(ChatEventEnum.TYPING_EVENT, (chatId) => {
    socket.in(chatId).emit(ChatEventEnum.TYPING_EVENT, chatId);
  });

  socket.on(ChatEventEnum.STOP_TYPING_EVENT, (chatId) => {
    socket.in(chatId).emit(ChatEventEnum.STOP_TYPING_EVENT, chatId);
  });
};


//this is a utility function for the controllers and the socket logic together
/**
 *
 * @param {import("express").Request} req - Request object to access the `io` instance set at the entry point
 * @param {string} roomId - Room where the event should be emitted
 * @param {AvailableChatEvents[0]} event - Event that should be emitted
 * @param {any} payload - Data that should be sent when emitting the event
 * @description Utility function responsible to abstract the logic of socket emission via the io instance
 */
export const emitSocketEvent = (req, roomId, event, payload) => {
  req.app.get("io").in(roomId).emit(event, payload);
};
// 1. Create a global set of online users
//set like in dsa
const onlineUsers = new Set(); 

export const initializeSocketIO = (io) => {
  // 1. AUTH MIDDLEWARE: Stop unauthenticated users at the door
  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || "");
      const token = cookies?.accessToken || socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication error: Token not found"));
      }

      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decodedToken?._id).select("-password");

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user; // 🚩 Attach user to socket for use below
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  // 2. CONNECTION HANDLER
  return io.on("connection", async (socket) => {
    try {
      const userId = socket.user._id.toString();
      
      // Join personal room for 1-on-1 messages
      socket.join(userId); 
      onlineUsers.add(userId);
      
      // Syncing status: Send current list to user & notify others
      socket.emit("ONLINE_USERS_LIST", Array.from(onlineUsers));
      socket.broadcast.emit("USER_ONLINE_STATUS", { userId, isOnline: true });

      // Mount your event listeners
      mountJoinChatEvent(socket);
      mountTypingEvents(socket);

      console.log(`⚡ User Online: ${socket.user.username}`);

      socket.on("disconnect", () => {
        onlineUsers.delete(userId);
        io.emit("USER_ONLINE_STATUS", { userId, isOnline: false });
        console.log(`👋 User Offline: ${userId}`);
      });
    } catch (error) {
      console.error("Socket Logic Error:", error.message);
      socket.disconnect(true);
    }
  });
};
//why we are storing them in the variabel?
//We wrap them in variables so we can neatly "mount" them inside the main io.on("connection") block without making the code a messy wall of text.