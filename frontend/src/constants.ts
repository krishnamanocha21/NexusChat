export const ChatEventEnum = Object.freeze({
  // 1. Connection Events
  CONNECTED_EVENT: "connected",
  DISCONNECT_EVENT: "disconnect",

  // 2. Chat Management Events
  JOIN_CHAT_EVENT: "joinChat",
  NEW_CHAT_EVENT: "newChat",

  // 3. Message Events
  MESSAGE_RECEIVED_EVENT: "messageReceived", // 🚩 Check: No space, CamelCase
  MESSAGE_DELETE_EVENT: "messageDeleted",

  // 4. UI/UX Feedback Events
  TYPING_EVENT: "typing",
  STOP_TYPING_EVENT: "stopTyping",

  // 5. Error Events
  SOCKET_ERROR_EVENT: "socketError",
} as const); // 'as const' makes this a read-only literal type

// This creates a type you can use for function arguments!
export type ChatEvents = typeof ChatEventEnum[keyof typeof ChatEventEnum];