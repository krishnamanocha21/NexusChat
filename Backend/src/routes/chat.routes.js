import { Router } from "express";
import { createOrGetOneOnOneChat } from "../controllers/chat.controllers.js";
import {verifyJWT} from "../middleware/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, createOrGetOneOnOneChat); // Access or Create Chat

export default router;