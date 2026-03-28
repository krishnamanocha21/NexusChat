import { Router } from "express";
import { createOrGetOneOnOneChat,getUserChats } from "../controllers/chat.controllers.js";
import {verifyJWT} from "../middleware/auth.middleware.js";

const router = Router();

// This MUST match the frontend: path is "/c/:receiverId" and method is .post
router.route("/c/:receiverId").post(verifyJWT, createOrGetOneOnOneChat);
router.route("/").get(verifyJWT, getUserChats);

export default router;