import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
//import listEndpoints from "express-list-endpoints";
import userRouter from './routes/user.routes.js';
import chatRouter from './routes/chat.routes.js';
import messageRouter from './routes/message.routes.js';
const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public")); 
app.use(cookieParser()); 

//console.log("Is userRouter loaded?", userRouter ? "Yes" : "No");
//console.log("UserRouter stack:", userRouter?.stack?.length); // Should be > 0
app.use("/api/v1/users", userRouter);
app.use("/api/v1/chats",chatRouter);
app.use("/api/v1/messages",messageRouter);

//console.log(listEndpoints(app));
export default app;