import { Message } from "../models/message.model.js";
import { Chat } from "../models/chat.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const sendMessage = asyncHandler(async (req, res) => {
    const { content, chatId } = req.body;

    var newMessage = {
        senderId: req.user._id,
        content: content,
        chatId: chatId,
    };

    let message = await Message.create(newMessage);
    
    // Update the Chat's latest message
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    res.status(200).json(message);
});