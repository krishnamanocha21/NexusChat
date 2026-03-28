import dotenv from 'dotenv';
dotenv.config({
    path: path.resolve(process.cwd(), '.env')
});
console.log("DEBUG: CORS_ORIGIN is ->", process.env.CORS_ORIGIN);
console.log("DEBUG: PORT is ->", process.env.PORT);

import connectDB from './db/db.js'
import app from "./app.js"
import path from 'path';
import {createServer} from  "http";
import { Server } from "socket.io";
import { initializeSocketIO } from "./socket/index.js";

const httpServer =createServer(app);
const io =new Server(httpServer,{
    pingTimeout:60000,
    cors:{
        origin: "http://localhost:5174", // Replace with  React/Vite port
    methods: ["GET", "POST"],
        credentials:true,
    },
});


app.set("io", io);
connectDB()
.then(()=>{
    //Socket.io requires a raw Node.js HTTP server to intercept the WebSocket handshake
    /*app.on("error", (error)=>{
        console.log("Server error:" ,error);
        throw error;
    });
    
    app.listen(process.env.PORT ||4000 ,()=>{
        console.log(`Server is running on port ${process.env.PORT}`)
    });
    */

    initializeSocketIO(io);
    httpServer.on("error",(error)=>{
        console.log("Server error :",error);
        throw error;
    });

    httpServer.listen(process.env.PORT || 4000, () => {
        console.log(`🚀 Real-time Server is running on port ${process.env.PORT || 4000}`);
    });
})
.catch((error)=>{
    console.error("MongoDB connection failed error:",error);
})
