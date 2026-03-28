import { Router } from "express";
import { createOrGetOneOnOneChat,getUserChats } from "../controllers/chat.controllers.js";
import {verifyJWT} from "../middleware/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, createOrGetOneOnOneChat); // Access or Create Chat
router.route("/").get(verifyJWT, getUserChats);

export default router;