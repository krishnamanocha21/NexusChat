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
        chatId: new mongoose.Types.ObjectId(chatId),
        // 🟢 THE FIX: Exclude messages where my ID is in the deletedBy array
        deletedBy: { 
          $ne: new mongoose.Types.ObjectId(req.user._id) 
        },
      },
    },
    ...chatMessageCommonAggregation(), // Joining user details
    {
      $sort: { createdAt: 1 },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, messages || [], "Messages fetched successfully"));
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;
  const { deleteType } = req.body;

  const message = await Message.findById(messageId);
  if (!message) throw new ApiError(404, "Message not found");

  if (deleteType === "everyone") {
    // 🚩 Check if requester is the sender
    if (message.senderId.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "You can only delete your own messages for everyone");
    }

    // Soft delete logic
    message.isDeleted = true;
    message.content = "This message was deleted"; 
    // Clear attachments if any, to save space/privacy
    message.attachments = []; 
    await message.save();

    // Notify others in the chat room
    emitSocketEvent(req, chatId, ChatEventEnum.MESSAGE_DELETE_EVENT, messageId);

  } else {
    // 🚩 "Delete for me" logic
    // Ensure the array exists (fallback for old messages)
    if (!message.deletedBy) message.deletedBy = [];

    // Only push if not already deleted
    if (!message.deletedBy.includes(req.user._id)) {
      message.deletedBy.push(req.user._id);
      await message.save();
    }
  }

  emitSocketEvent(
  req, 
  chatId, 
  ChatEventEnum.MESSAGE_DELETE_EVENT, 
  messageId // Sending the ID to the frontend
);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Message deleted successfully"));
});