import { Router } from "express";
import { sendMessage, getChatMessages } from "../controllers/message.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// Routes for /api/v1/messages
router.route("/:chatId").post(verifyJWT, sendMessage); 
router.route("/:chatId").get(verifyJWT, getChatMessages); 

export default router;