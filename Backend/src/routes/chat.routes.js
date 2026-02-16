import { Router } from "express";
import { accessChat } from "../controllers/chat.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, accessChat); // Access or Create Chat

export default router;