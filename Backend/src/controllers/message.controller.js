import { Message } from "../models/message.model.js"; // Adjust path as needed
import { Chat } from "../models/chat.model.js";




const getChatMessages = async (req, res) => {
  const { chatId } = req.params;

  // 1. Check if chat exists
  const chat = await Chat.findById(chatId);
  if (!chat) {
    return res.status(404).json({ message: "Chat not found" });
  }

  // 2. Execute Aggregation
  const messages = await Message.aggregate([
    {
      $match: {
        chatId: new mongoose.Types.ObjectId(chatId),
        isDeleted: false, // Only show non-deleted messages
      },
    },
    ...chatMessageCommonAggregation(), // Spread the aggregation stages here
    {
      $sort: { createdAt: 1 }, // Order by time (oldest to newest)
    },
  ]);

  return res.status(200).json({
    success: true,
    data: messages,
  });
};