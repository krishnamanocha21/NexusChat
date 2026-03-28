import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

//this variable is eventually going to hold a very specific kind of object—a Socket.io connection
//because we are using TypeScript, we can specify the type of this variable to be Socket or null (initially it will be null until the connection is established)
const SocketContext = createContext<Socket | null>(null);

//same reasonn for using the .FC
//react.fc->This component is a wrapper. It is designed to hold other components inside of it
//It tells TypeScript that the children can be anything valid in React—a single HTML tag, another React component, a string of text, or even an array of multiple components
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  //Establishing the Connection (useEffect)
  useEffect(() => {
    // Replace with your backend URL
    const Socket = io("http://localhost:4000", {
  withCredentials: true, // 👈 CRITICAL: This sends your cookies to the socket server
  transports: ["websocket", "polling"], 
});
    
    setSocket(Socket);

    //The Cleanup (Return Function): newSocket.close() is vital. If the user logs out or the app closes, this "hangs up the phone." Without this, you would leave "ghost connections" on your server, eventually crashing i
    return () => {
      Socket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);