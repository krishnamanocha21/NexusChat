import mongoose from "mongoose";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import { ChatEventEnum } from "../constants.js";
import { emitSocketEvent } from "../socket/index.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * @description Utility to get common message aggregation stages
 */
const chatMessageCommonAggregation = () => {
  return [
    {
      $lookup: {
        from: "users",
        localField: "sender",
        foreignField: "_id",
        as: "sender",
        pipeline: [
          {
            $project: {
              username: 1,
              profileUrl: 1,
              fullName: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        sender: { $first: "$sender" },
      },
    },
  ];
};

export const sendMessage = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Message content is required");
  }

  const selectedChat = await Chat.findById(chatId);
  if (!selectedChat) {
    throw new ApiError(404, "Chat does not exist");
  }

  // --- THE FIX IS HERE ---
  // Change 'sender' to 'senderId' and 'chat' to 'chatId'
  const message = await Message.create({
    senderId: req.user._id, // Matches your schema
    chatId: new mongoose.Types.ObjectId(chatId), // Matches your schema
    content: content,
  });
  // -----------------------

  // Update the Chat's latest message
  await Chat.findByIdAndUpdate(chatId, {
    $set: { latestMessage: message._id },
  });

  // Since we changed the field names, we must also update the Aggregation!
  const messages = await Message.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(message._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "senderId", // Updated to match
        foreignField: "_id",
        as: "sender",
        pipeline: [
          { $project: { username: 1, profileUrl: 1, fullName: 1 } },
        ],
      },
    },
    { $addFields: { sender: { $first: "$sender" } } },
  ]);

  const receivedMessage = messages[0];

  // Socket emission logic...
  selectedChat.participants.forEach((participant) => {
    //double message error
    // 🚩 THE FIX: Do not emit the socket event to the person who sent it!
    // We convert both to strings to ensure they compare correctly
    if (participant.user.toString() === req.user._id.toString()) return;

    // Only emit to the OTHER participants
    emitSocketEvent(
      req,
      participant.user.toString(), // Send to the user's specific room
      ChatEventEnum.MESSAGE_RECEIVED_EVENT,
      receivedMessage
    );
  });

  return res.status(201).json(new ApiResponse(201, receivedMessage, "Message sent"));
});

export const getChatMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    throw new ApiError(400, "Invalid Chat ID");
  }

  const selectedChat = await Chat.findById(chatId);

  if (!selectedChat) {
    throw new ApiError(404, "Chat does not exist");
  }

  // Execute aggregation to fetch history
  // ... inside getChatMessages
const messages = await Message.aggregate([
  {
    $match: {
      // 🚩 CHANGE THIS: Your Atlas screenshot shows 'chatId'
      chatId: new mongoose.Types.ObjectId(chatId), 
    },
  },
  ...chatMessageCommonAggregation(),
  {
    $sort: { createdAt: 1 },
  },
]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, messages || [], "Messages fetched successfully")
    );
});