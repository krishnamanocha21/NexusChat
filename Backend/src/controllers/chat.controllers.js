import { Chat } from "../models/chat.model.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createOrGetOneOnOneChat = asyncHandler(async (req, res) => {
    const {receiverId}=req.params
});