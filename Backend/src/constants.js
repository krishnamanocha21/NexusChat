/*1.Create src/constants.js to store event names like MESSAGE_RECEIVED or TYPING_EVENT. This ensures your frontend and backend stay perfectly in sync
2.Think of it as a dictionary that both the Server and Client must agree on so they can understand each other.
Without this file, if you accidentally type "message-received" on the backend but "messagereceived" on the frontend, your chat will simply not work, and you won't get an error message to tell you why

CONNECTED_EVENT	        The handshake is successful             Used to show a "Connected" status in the UI or start fetching the chat list.
DISCONNECT_EVENT	    The user closed the app or lost net.	Used to set isOnline: false in your User Model.
JOIN_CHAT_EVENT	        User clicked on a specific person.	    Tells the server to put the user in a "Room" so they only see messages for that chat.
NEW_CHAT_EVENT	        A new 1-on-1 or group was made.     	Alerts the receiver to add a new contact to their sidebar instantly.
MESSAGE_RECEIVED_EVENT	A new message has arrived.          	This is the "Ding!" moment. It pushes the message into your Redux store.
MESSAGE_DELETE_EVENT	A user deleted a message.           	Removes the message from the UI for both users without a page refresh.
TYPING_EVENT	        User is pressing keys.	                 Triggers that "..." loading bubble you wanted to implement.
*/

//* Using an Enum-like object prevents typos across the project.

export const ChatEventEnum = Object.freeze({
  // 1. Connection Events
  CONNECTED_EVENT: "connected",
  DISCONNECT_EVENT: "disconnect",

  // 2. Chat Management Events
  JOIN_CHAT_EVENT: "joinChat",
  NEW_CHAT_EVENT: "newChat",

  // 3. Message Events
  MESSAGE_RECEIVED_EVENT: "messageReceived",
  MESSAGE_DELETE_EVENT: "messageDeleted",

  // 4. UI/UX Feedback Events
  TYPING_EVENT: "typing",
  STOP_TYPING_EVENT: "stopTyping",

  // 5. Error Events
  SOCKET_ERROR_EVENT: "socketError",
});

export const AvailableChatEvents = Object.values(ChatEventEnum);
