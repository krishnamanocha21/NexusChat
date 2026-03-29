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
        localField: "senderId", // 🚩 FIXED: Matches your schema field name
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

  // 1. Create the message
  const message = await Message.create({
    senderId: req.user._id,
    chatId: new mongoose.Types.ObjectId(chatId),
    content: content,
  });

  // 2. Update the Chat's latest message pointer
  await Chat.findByIdAndUpdate(chatId, {
    $set: { latestMessage: message._id },
  });

  // 3. Aggregate the message to get the sender details (Full Object)
  const messages = await Message.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(message._id),
      },
    },
    ...chatMessageCommonAggregation(), // Use the fixed helper here
  ]);

  const receivedMessage = messages[0];

  if (!receivedMessage) {
    throw new ApiError(500, "Internal server error during message aggregation");
  }

  // 4. Socket emission logic
  selectedChat.participants.forEach((participant) => {
    // 🚩 Do not emit to the sender (they already have the message in UI)
    if (participant.user.toString() === req.user._id.toString()) return;

    // Emit to each participant's individual room
    emitSocketEvent(
      req,
      participant.user.toString(),
      ChatEventEnum.MESSAGE_RECEIVED_EVENT,
      receivedMessage
    );
  });

  return res
    .status(201)
    .json(new ApiResponse(201, receivedMessage, "Message sent successfully"));
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

  const messages = await Message.aggregate([
    {
      $match: {
        chatId: new mongoose.Types.ObjectId(chatId), // Matches schema field
      },
    },
    ...chatMessageCommonAggregation(), // Join user details
    {
      $sort: { createdAt: 1 }, // Oldest first for chat flow
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, messages || [], "Messages fetched successfully"));
});