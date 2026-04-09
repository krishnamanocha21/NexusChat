import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from './routes/user.routes.js';
import chatRouter from './routes/chat.routes.js';
import messageRouter from './routes/message.routes.js';

const app = express();

// 1. CORS at the VERY TOP
app.use(cors({
    // Replace the hardcoded string with the environment variable
    origin: process.env.CORS_ORIGIN, 
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
}));

// 2. Cookie Parser NEXT
app.use(cookieParser());

// 3. Body Parsers
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public")); 

// 4. Routes
app.get("/api/v1/test", (req, res) => {
    res.json({ message: "Backend is reachable and routes are working!" });
});
app.use("/api/v1/users", userRouter);
app.use("/api/v1/chats", chatRouter);
app.use("/api/v1/messages", messageRouter);

export default app;