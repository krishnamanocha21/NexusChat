import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "../utils/ApiError.js";
import { emitSocketEvent } from "../socket/index.js";
import { ChatEventEnum } from "../constants.js";
import mongoose from "mongoose";

/*
* @description Utility function which returns the pipeline stages to structure the chat schema with common lookups
* @returns {mongoose.PipelineStage[]}
the chatCommonAggregation is a reusable formatting engine. Instead of just getting a raw list of "IDs" from MongoDB,
this function tells the database to "go fetch" the actual user profiles and message details so the data is ready to be displayed on a screen. 
*/

//the mongoose will the know that the participant is in the chat because we are using the chatCommon
// Aggregation inside the chat.aggregate that we are using inside the chatcontroller
//does not need an input parameter because it doesn't perform the search itself—it only provides the list of instructions on how to format the data once the search starts.
const chatCommonAggregation = () => {
  /*when we write the things side by side and when we arite them in the same array objects;

        1.Scenario: You want to show the Participants and the Group Admin details. Both of these IDs live directly on the Chat document.
        Analogy: This is like checking a passport for the Owner's Name and then checking it for the Issue Date. Both pieces of info are written right there on the same passport.

        2.Scenario: You want to fetch the Latest Message, and inside that message, you want to see the Sender's Name
        This is like finding a Locker ID written on a wall (Chat), going to that Locker (Message), and then opening the Wallet (Sender) found inside that locker. You couldn't see the wallet until you opened the locker first.
        */

  return [
    {
      //lookup acts like a "Data Connector" between two different tables (collections) in your database.
      // 1. Look for the user/participants details inside the participant objects
      $lookup: {
        /////////see the User ->users ,Participant ->participants///////
        from: "users",
        //the locla field here means the chat model as we are making the chatcontroller
        localField: "participants.user", // Reaches into the 'user' field of the participantSchema
        foreignField: "_id",
        as: "participantDetails",
      },
    },

    // 2. Lookup for the latest message using 'latestMessage' field from chatSchema
    {
      $lookup: {
        from: "messages", // Matches your 'Message' model collection name
        localField: "latestMessage", //Yes, they must match in value.
        foreignField: "_id",
        as: "latestMessage",
        //the pipeline here is added because inside that latestmessage i also want to the know the details of the sender
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "senderId",
              foreignField: "_id",
              as: "sender",
              pipeline: [
                {
                  //the  project is used to send only that data to the user back it is like a security check
                  $project: {
                    //1 for including the field and 0 for not
                    username: 1,
                    profileUrl: 1,

                    isOnline: 1,
                    lastSeen: 1,
                    fullName: 1,
                  },
                },
              ],
            },
          },
          /*whenever you use a $lookup (a "join"), it returns the results as an array—even if it only finds one single matching document.
            sender: [ { username: "Krish", ... } ] (Notice the square brackets []).
            The $addFields with $first "flattens" that array into a single object. */
          {
            $addFields: {
              //these all fields are already in the chat model we are first searching through he aggregation then with the addfields we are making them out of the array
              sender: { $first: "$sender" },
            },
          },
        ],
      },
    },

    //we are doing this so that we will get the  latest last message only and also
    {
      // 4. Cleanup and flattening
      $addFields: {
        latestMessage: { $first: "$latestMessage" },
      },
    },

    /* this is the final logc of the cmomplete aggregation which used all of the above lookup etc */
    {
      // 5. Projecting final fields to hide sensitive user data
      //Merging user details back into the participants list.
      $project: {
        chatName: 1,
        isGroupChat: 1,
        groupAdmin: 1,
        createdAt: 1,
        updatedAt: 1,
        latestMessage: 1,

        // We map back to participants but ensure passwords/tokens are hidden
        //the map is a for each and filter search in an array which is in the same collection adn lookup works for the diefferent collection
        participants: {
          $map: {
            //this comes from the chat model
            input: "$participants",
            as: "p",
            //this in tells that in what format you should return the participants
            in: {
              role: "$$p.role",
              joinedAt: "$$p.joinedAt",
              user: {
                //The filter always returns an array,
                //arrelemat element is the index picker of a particular index of the array
                $arrayElemAt: [
                  {
                    $filter: {
                      //as i have save the as option in the first lookup as the partcipant detail so here also i have to save it aa participant details
                      input: "$participantDetails",
                      as: "pd",
                      //The eq (Equality) operator is comparing two specific IDs:
                      cond: { $eq: ["$$pd._id", "$$p.user"] },
                    },
                  },
                  0,
                ],
              },
            },
          },
        },
      },
    },
  ];
};

//the Socket.io part is what makes the new chat "pop up" on the other user's screen instantly without them having to refresh
//Sidebar (Left)  	createOrGetAOneOnOneChat	  Shows who you can talk to and a preview of the last message.
export const createOrGetOneOnOneChat = asyncHandler(
  async (req, res) => {
    //For req.params to have data, you must use a colon (:) in your route string. This tells Express, "Hey, whatever comes in this part of the URL, capture it."
    //Route Definition: app.get('/users/:userId', (req, res) => { ... })
    const { receiverId } = req.params;

    //1. Check if it's a valid receiver
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      throw new ApiError(404, "Receiver does not exist");
    }

    //2. check if receiver is not the user who is requesting a chat
    if (receiver._id.toString() === req.user._id.toString()) {
      throw new ApiError(400, "You cannot chat with yourself");
    }

    //3.  Search for existing 1-on-1 chatThis part of your code is the "Search & Format" engine of your chat application. It ensures that when you look for a chat, you don't just get a list of IDs, but a fully detailed object ready for your React frontend
    // Note: We search for chats where participants.user matches both IDs
    const chat = await Chat.aggregate(
      // In MongoDB and Mongoose, Chat.aggregate() is used to perform complex data processing that a simple .find() cannot handle.
      //it always takes an  array because it follows a Pipeline Architecture. Each object inside that array is called a Stage. The data flows through these stages in order:

      [
        {
          //$match is your Gatekeeper ,it is doing the checking work

          $match: {
            isGroupChat: false,
            //$and is a Logical Operator used to join multiple conditions. For a document to "pass" through the filter, every single condition inside the $and array must be true.
            $and: [
              { "participants.user": req.user._id },
              {
                "participants.user": new mongoose.Types.ObjectId(
                  receiverId
                ),
              },
            ],
          },
        },
        //it jumps to the messages to find the latest message
        //then it jumps to the usercollection to grab the userdetails an d pfp
        ...chatCommonAggregation(),
      ]
    );

    if (chat.length) {
      return res
        .status(200)
        .json(
          new ApiResponse(200, chat[0], "Chat retrieved successfully")
        );
    }

    // 4. Create new chat if not found
    // We must match your participantSchema: { user: ID, role: ... }
    const newChatInstance = await Chat.create({
      chatName: "One on one chat",
      isGroupChat: false,
      participants: [
        //we are not using the new mongoose type because This ID comes from your Authentication Middleware
        //so it is already in the coorect object type
        { user: req.user._id, role: "admin" },
        //but the reciverid mostprobab comes formt the params os it will be in json string format
        /*MongoDB stores _id fields as ObjectId, not plain strings 
        You are explicitly converting a string into an ObjectId instance
        */
        {
          user: new mongoose.Types.ObjectId(receiverId),
          role: "member",
        },
        //This ID comes from req.params You must manually convert it to a new mongoose.Types.ObjectId() so the database can use it for matching and linking
      ],
      groupAdmin: req.user._id,
    });

    // 5. Aggregate the newly created chat to get full details (sender, participant info)
    const createdChat = await Chat.aggregate([
      {
        $match: {
          _id: newChatInstance._id,
          //we created above
        },
      },
      ...chatCommonAggregation(),
    ]);
    //it returns a hybrid model with the chat model and containg the user details also
    //it also contains the details of the two users
    const payload = createdChat[0];
    if (!payload) {
      throw new ApiError(
        500,
        "Internal server error while fetching new chat"
      );
    }

    // 6. Socket Logic: Notify the receiver
    payload.participants.forEach((participant) => {
      // Only emit to the receiver (the one who didn't initiate the request)
      if (participant.user._id.toString() === req.user._id.toString())
        return;

      //This function sends a message through a "WebSocket"
      emitSocketEvent(
        //The socket utility needs access to req.app.get("io"
        req,
        //This is the Recipient's ID
        participant.user._id.toString(),
        //The specific "signal" name. On the frontend, your friend’s computer is "listening" for this specific name
        ChatEventEnum.NEW_CHAT_EVENT,
        //he full data of the chat (names, photos, IDs).
        payload
      );
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, payload, "Chat created successfully")
      );
  }
);

export const createAGroupChat = asyncHandler(async (req, res) => {
  const { chatName, participants } = req.body; // Using 'chatName' as per schema

  // 1. Validation: Ensure the creator isn't in the provided participants array
  if (participants.includes(req.user._id.toString())) {
    throw new ApiError(
      400,
      "Participants array should not contain the group creator"
    );
  }

  // 2. Create a unique list of IDs and validate group size
  // *you take the array of user ids and then pass that array to the set constructor (The Set automatically looks at the IDs and deletes any duplicates.)
  //[...] (Spread Operator): Since a Set is not an array (it's a "Set object"), use the spread operator to turn those unique values back into a standard JavaScript array.
  const uniqueParticipantIds = [...new Set([...participants])];

  if (uniqueParticipantIds.length < 2) {
    throw new ApiError(
      400,
      "A group chat must have at least 3 members including admin"
    );
  }

  // 3. Transform IDs into the sub-document structure required by participantSchema
  const participantsData = [
    {
      user: req.user._id,
      role: "admin",
      joinedAt: new Date(),
    },

    ...uniqueParticipantIds.map((id) => ({
      user: new mongoose.Types.ObjectId(id),
      role: "member",
      joinedAt: new Date(),
    })),
  ];

  // 4. Create the group chat
  const groupChat = await Chat.create({
    chatName: chatName || "New Group",
    isGroupChat: true,
    participants: participantsData,
    groupAdmin: req.user._id,
  });

  // 5. Structure the chat using your aggregation pipeline
  //getting all the details of the user
  const chat = await Chat.aggregate([
    {
      $match: {
        _id: groupChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  //get the first chat
  const payload = chat[0];

  if (!payload) {
    throw new ApiError(
      500,
      "Internal server error during aggregation"
    );
  }

  // 6. Socket Logic: Notify all participants (except the creator)
  payload?.participants?.forEach((participant) => {
    if (participant.user._id.tostring() === req.user._id.tostring())
      return;

    emitSocketEvent(
      req,
      participant.user._id.toString(),
      ChatEventEnum.NEW_CHAT_EVENT,
      payload
    );
  });

  return res
    .status(201)
    .json(
      new ApiResponse(201, payload, "Group chat created successfully")
    );
});

const deleteCascadeChatMessages =asyncHandler (async (chatId) => {

    try{
  // 1. Fetch all messages in this chat that have attachments
  /*this was the old one when we are not using the cloudinary 
    the Message modle is containing the chatid in it to extracting the chat
    const messages =await Message.find({
        MongoDB stores _id fields as ObjectId, not plain strings 
        You are explicitly converting a string into an ObjectId instance
       // chatId:new mongoose.Types.ObjectId(chaId),
        //because it is likely to come from the params so will be in json string 

    })
        
   // 2. Extract all attachments from all messages
    //Collect all public_ids for Cloudinary deletion
    //schema has-> attachments:fileUrl, fileType, fileSize 
    const allAttachments =[];
    messages.forEach((message)=>{
        if(message.attachments &&message.attachments.length>0){
            //if you are not using the spread operatorehre  then all the elemnets will pass as a single  element array because of the model strucutre
            allAttachments.push(...message.attachments);
        }
    });
    */

  //.find will return the array
  const messages = await Message.find({
    //Does the attachments array have at least one item?
    chatId: chatId,
    "attachments.0": {
      $exists: true,
    },
  });

  //.map() creates a new array of the same length, .reduce() is more flexible. For example, if some messages don't have attachments, you can skip them entirely, resulting in a cleaner list.
  //accumulator ->This is the "running total" or the collection you are building. help in the inner iteration
  //msg (Current Value): This represents the specific message object the loop is currently looking at
  
  //// 2. Extract all publicIds into a single flat array
  const publicIds = messages.reduce((acc, msg) => {
    const ids = msg.attachments
      .filter((att) => att.publicId) // Ensure publicId exists
      .map((att) => att.publicId);
    return acc.concat(ids);
  }, []);

  // 3. Delete files from Cloudinary
    if (publicIds.length > 0) {
    // We wrap these in Promise.all so they run in parallel
    await Promise.all(
      publicIds.map((id) => 
        cloudinary.uploader.destroy(id)
          .catch(err => console.error(`Failed to delete asset ${id}:`, err))
      )
    );
  }
  // 4. Finally, delete all message records from MongoDB
  //this is the method by mongodb
  await Message.deleteMany({ chatId: chatId });
  console.log(`Successfully cleared chat ${chatId} and its assets.`);

  } catch (error) {
    console.error("Error in cascade deletion:", error);
    throw error;
  }
});

export const  deleteGroupChat = asyncHandler(async (req, res) => {
    const { chatId } = req.params;

    // 1. Fetch group chat and validate existence
  // Note: Using findById is usually faster than aggregate if you just need the admin/participants
  //thats why we are not using the chatcommoonaggregation method
  const chat = await Chat.findById(chatId);
  
  if (!chat) {
    throw new ApiError(404, "Group chat does not exist");
  }

  // 2. Check if the logged-in user is the group admin
  if (chat.admin?.toString() !== req.user._id?.toString()) {
    throw new ApiError(403, "Only admin can delete the group");
  }

  // 3. Perform the cascade deletion (Cloudinary files + MongoDB Messages)
  await deleteCascadeChatMessages(chatId);

  // 4. Delete the Chat itself (monggose method)
  await Chat.findByIdAndDelete(chatId);

  // 5. Notify participants via Socket.io
  chat.participants?.forEach((participantId) => {
    // Skip the admin who is performing the deletion
    if (participantId.toString() === req.user._id.toString()) return;

    emitSocketEvent(
      req,
      participantId.toString(),
      ChatEventEnum.LEAVE_CHAT_EVENT,
      chat // Sending the deleted chat object so frontend can remove it from state
    );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Group chat and all assets deleted successfully"));
});

export const deleteOneOnOneChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  // 1. Fetch chat with aggregation to get full details for the socket payload
  const chat = await Chat.aggregate([
    {
        //because the chat id was given by params was in the string format and not in the json object format so that why we use the new mongoose 
      $match: {
        _id: new mongoose.Types.ObjectId(chatId),
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(404, "Chat does not exist");
  }

  if (payload.isGroupChat) {
    throw new ApiError(400, "This endpoint is only for one-on-one chats");
  }

  //we have deleted the messages first because in case the cascading fails 
  //  Delete the chat document
  await Chat.findByIdAndDelete(chatId);

  //  Cascade delete: This triggers your logic for messages and Cloudinary files
  await deleteCascadeChatMessages(chatId);

  // 5. Identify the recipient to notify via Socket.io
  const otherParticipant = payload?.participants?.find(
    (participant) => participant?._id.toString() !== req.user._id.toString()
  );

  // 6. Real-time update: Notify the other user so the chat disappears from their UI
  if (otherParticipant) {
    emitSocketEvent(
      req,
      otherParticipant._id?.toString(),
      ChatEventEnum.LEAVE_CHAT_EVENT,
      payload // Sending full payload so the frontend knows exactly which chat to remove
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Chat deleted successfully"));
});

export const getGroupChatDetails =asyncHandler(async(req,res)=>{
   const { chatId } = req.params;

  // Validate the ID before hitting the DB
  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    throw new ApiError(400, "Invalid Chat ID");
  }

  const groupChat = await Chat.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(chatId),
        isGroupChat: true,
      },
    },
    ...chatCommonAggregation(), // This should populate participants and lastMessage
  ]);

  const chat = groupChat[0];

  if (!chat) {
    throw new ApiError(404, "Group chat does not exist");
  }

  // Security Check: Only members of the group should see the details
  const isParticipant = chat.participants.some(
    (p) => p._id.toString() === req.user?._id.toString()
  );

  if (!isParticipant) {
    throw new ApiError(403, "You are not a member of this group");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, chat, "Group chat details fetched successfully"));
});

export const renameGroupChat =asyncHandler(async (req,res)=>{
    const { chatId } = req.params;
    const { name } = req.body;//input

    // 1. Validate Input
  if (!name || name.trim() === "") {
    throw new ApiError(400, "Group name cannot be empty");
  }

  // 2. Fetch Chat and Verify Permissions
  const groupChat = await Chat.findById(chatId);

  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist");
  }

  if (!groupChat.isGroupChat) {
    throw new ApiError(400, "This is not a group chat");
  }
  const oldName = groupChat.name;
  const newName = name.trim();

  // If the name isn't actually changing, just return early to save DB calls
  if (oldName === newName) {
    return res.status(200).json(new ApiResponse(200, groupChat, "Name is already up to date"));
  }

  // 3. Update the Chat Name and return the id of the new chat
  const updatedGroupChat = await Chat.findByIdAndUpdate(
    chatId,
    { $set: { name: newName } },
    //means return the new name chat instance
    { new: true }
  );

  // 4. Create a Timeline/System Message
  //  with a specific content format
  const systemMessage = await Message.create({
    senderId: req.user._id,
    chatId: chatId,
    content: `changed the group subject from "${oldName}" to "${newName}"`,
    status: [{ userId: req.user._id, status: 'sent' }] 
  });

  // 5. Aggregate to get the full chat payload for the frontend
  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updatedGroupChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error while retrieving updated chat");
  }

  // 6. Emit Socket Events to all participants
  payload.participants?.forEach((participant) => {
    const participantId = participant._id?.toString();
    
    // Event 1: Tell the sidebar to update the group name
    emitSocketEvent(
      req,
      participantId,
      ChatEventEnum.UPDATE_GROUP_NAME_EVENT,
      payload
    );

    // Event 2: Instantly drop the new system message into their open chat window
    emitSocketEvent(
      req,
      participantId,
      ChatEventEnum.MESSAGE_RECEIVED_EVENT,
      systemMessage
    );
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, payload, "Group chat name updated successfully")
    );
});

export const addNewParticipantInGroupChat =asyncHandler(async(req,res)=>{
    const { chatId, participantId } = req.params;

    // 1. Validate that the participantId is a valid MongoDB ObjectId string
    if (!mongoose.Types.ObjectId.isValid(participantId)) {
    throw new ApiError(400, "Invalid participant ID");
  }

  // 2. Fetch the group chat
  const groupChat = await Chat.findById(chatId);

  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist");
  }

  // 3. Ensure it is actually a group chat
  if (!groupChat.isGroupChat) {
    throw new ApiError(400, "This is not a group chat");
  }

  // 4. Check if the logged-in user is the admin
  // Use 403 Forbidden for permission issues
  if (groupChat.admin?.toString() !== req.user._id?.toString()) {
    throw new ApiError(403, "Only admins can add new participants");
  }

  // 5. Check if user is already a participant
  // We convert to string to ensure the comparison is accurate
  const isAlreadyParticipant = groupChat.participants.some(
    (p) => p.toString() === participantId
  );

  if (isAlreadyParticipant) {
    throw new ApiError(409, "User is already in this group");
  }

  // Fetch the user being added to grab their name for the timeline message
  const userToAdd = await User.findById(participantId).select("name username");
  if (!userToAdd) {
    throw new ApiError(404, "The user you are trying to add does not exist");
  }

  // 6. Update the chat and the stores the new id
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: { participants: participantId },
    },
    //tells Mongoose to return the modified document instead.
    { new: true }
  );

  // 6. Create the System Timeline Message
  const identifier = userToAdd.username || userToAdd.name || "a new participant";
  
  const systemMessage = await Message.create({
    senderId: req.user._id,
    chatId: chatId,
    content: `added ${identifier}`,
    status: [{ userId: req.user._id, status: 'sent' }]
  });

  // 7. Aggregate to get the full formatted chat object (for frontend UI consistency)
  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updatedChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error while fetching updated chat");
  }

  // 8. Socket Events Broadcast
  // A. Notify the newly added user so the chat pops up in their sidebar
  emitSocketEvent(req, participantId, ChatEventEnum.NEW_CHAT_EVENT, payload);

  // B. Notify everyone in the group (including the new guy)
  payload.participants?.forEach((participant) => {
    const pId = participant._id?.toString();
    
    // Existing users need their sidebar/header updated with the new member count
    if (pId !== participantId) {
      emitSocketEvent(req, pId, ChatEventEnum.UPDATE_GROUP_EVENT, payload);
    }
    
    // Everyone needs to see the "Admin added User" message in the active chat window
    emitSocketEvent(req, pId, ChatEventEnum.MESSAGE_RECEIVED_EVENT, systemMessage);
  });

  // Optional: Notify existing members that someone new joined
  // emitSocketEvent(req, chatId, ChatEventEnum.UPDATE_GROUP_EVENT, payload);

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Participant added successfully"));
});

export const removeParticipantFromGroupChat = asyncHandler(async (req, res) => {
    const { chatId, participantId } = req.params;

  // 1. Validate chat and the participant 
  if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(participantId)) {
    throw new ApiError(400, "Invalid Chat ID or Participant ID");
  }


  // 2. Fetch Chat and verify it's a group
  const groupChat = await Chat.findById(chatId);

  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist");
  }

  if (!groupChat.isGroupChat) {
    throw new ApiError(400, "This is not a group chat");
  }

  if (groupChat.admin?.toString() !== req.user._id?.toString()) {
    throw new ApiError(403, "Only admins can remove participants");
  }

  // Prevent admin from removing themselves via this route
  if (groupChat.admin?.toString() === participantId) {
    throw new ApiError(400, "Admin cannot remove themselves. Please use the 'Leave Group' option.");
  }

  // 4. Check if participant is actually in the group
  const isParticipant = groupChat.participants.some(
    (p) => p.toString() === participantId
  );

  if (!isParticipant) {
    throw new ApiError(400, "Participant does not exist in the group chat");
  }

  // 5. Remove participant from the array
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
     ////MongoDB scans the participants array in your Chat document and removes all instances of that specific participantId
      $pull: { participants: participantId },
    },
    { new: true }
  );

  // 6. Create a System Message for the timeline
  // Fetching the removed user's details just to get their name/username
  const removedUser = await User.findById(participantId).select("username name");
  const identifier = removedUser ? (removedUser.username || removedUser.name) : "a participant";

  const systemMessage = await Message.create({
    senderId: req.user._id,
    chatId: chatId,
    content: `removed ${identifier}`,
    status: [{ userId: req.user._id, status: 'sent' }]
  });

  // 7. Aggregate to get the updated chat payload
  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updatedChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error while fetching updated chat");
  }

  // 8. Socket Events
  // Tell the removed user they have been kicked so their UI removes the chat
  emitSocketEvent(req, participantId, ChatEventEnum.LEAVE_CHAT_EVENT, payload);

  // Tell the remaining members about the change
  payload.participants?.forEach((participant) => {
    const pId = participant._id?.toString();
    
    // Update their group settings UI (so the user disappears from the member list)
    emitSocketEvent(req, pId, ChatEventEnum.UPDATE_GROUP_EVENT, payload);

    // Drop the "Admin removed user" message into their active chat window
    emitSocketEvent(req, pId, ChatEventEnum.MESSAGE_RECEIVED_EVENT, systemMessage);
  });

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Participant removed successfully"));

});

export const leaveGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id.toString();

  // 1. Validate ID
  //Mongoose will try to "cast" (convert) that string into a MongoDB 12 character/24-bit hexadecimal ID

  //because the isvalid function will require this format
  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    throw new ApiError(400, "Invalid Chat ID");
  }
  const groupChat = await Chat.findById(chatId);

  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist");
  }

  if (!groupChat.isGroupChat) {
    throw new ApiError(400, "This is not a group chat");
  }

  // 3. Verify user is actually in the group
  const isParticipant = groupChat.participants.some(
    (p) => p.toString() === userId
  );

  if (!isParticipant) {
    throw new ApiError(400, "You are not a part of this group chat");
  }

  
  //select all the participat other than then the user leaving
  const remainingParticipants = groupChat.participants.filter(
    (p) => p.toString() !== userId
  );

  if (remainingParticipants.length === 0) {
    // A: The last person is leaving. Delete the group and its Cloudinary assets.
    await deleteCascadeChatMessages(chatId);
    await Chat.findByIdAndDelete(chatId);

    return res.status(200).json(
      new ApiResponse(200, {}, "Left group successfully and group was deleted as it became empty")
    );
  }

  //  B: People are still in the group. Prepare the update query.
  let updateQuery = {
    //removing that particularperson
    $pull: { participants: req.user._id },
  };

  // If the person leaving is the admin, assign the next person in line as the new admin
  if (groupChat.admin?.toString() === userId) {
    //i am assigning the next person as the admin update query was the above function 
    updateQuery.$set = { admin: remainingParticipants[0] };
  }

  // 5. Update the Chat
  const updatedChat = await Chat.findByIdAndUpdate(chatId, updateQuery, { new: true });

  // 6. Create the System Timeline Message
  const systemMessage = await Message.create({
    senderId: req.user._id,
    chatId: chatId,
    content: `left the group`, // Frontend will render "Krishna left the group"
    status: [{ userId: req.user._id, status: 'sent' }]
  });

  // 7. Aggregate to get the updated chat payload
  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updatedChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error while fetching updated chat");
  }

  // 8. Socket Events
  // Tell the remaining members about the change and drop the system message
  payload.participants?.forEach((participant) => {
    const pId = participant._id?.toString();
    
    emitSocketEvent(req, pId, ChatEventEnum.UPDATE_GROUP_EVENT, payload);

    //this will send a message 
    emitSocketEvent(req, pId, ChatEventEnum.MESSAGE_RECEIVED_EVENT, systemMessage);
  });

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Left the group successfully"));
});

export const makeGroupAdmin = asyncHandler(async (req, res) => {
  // Assuming the route looks like: /api/chats/group/:chatId/admin/:participantId
  const { chatId, participantId } = req.params;

  // 1. Validate both IDs to prevent MongoDB CastErrors
  //thsi will convert the chatid to the hexadecimal format required
  if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(participantId)) {
    throw new ApiError(400, "Invalid Chat ID or Participant ID");
  }

  // 2. Fetch the chat
  const groupChat = await Chat.findById(chatId);

  if (!groupChat) {
    throw new ApiError(404, "Group chat does not exist");
  }

  if (!groupChat.isGroupChat) {
    throw new ApiError(400, "This is not a group chat");
  }

  // 3. Authorization: Only the current admin can hand over the role
  if (groupChat.admin?.toString() !== req.user._id?.toString()) {
    throw new ApiError(403, "Only the current admin can assign a new admin");
  }

  // 4. Prevent unnecessary database calls if they select themselves
  if (groupChat.admin?.toString() === participantId) {
    throw new ApiError(400, "You are already the admin of this group");
  }

  // 5. Verify the target user is actually a participant in the group
  const isParticipant = groupChat.participants.some(
    (p) => p.toString() === participantId
  );

  if (!isParticipant) {
    throw new ApiError(400, "The user you are trying to make admin is not in this group");
  }

  // 6. Update the admin field in the database
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $set: { admin: participantId },
    },
    { new: true }
  );

  // 7. Fetch the new admin's name for the timeline message
  const newAdmin = await User.findById(participantId).select("name username");
  const identifier = newAdmin ? (newAdmin.username || newAdmin.name) : "a participant";

  // 8. Create the System Timeline Message
  const systemMessage = await Message.create({
    senderId: req.user._id,
    chatId: chatId,
    // Frontend will render: "Krishna made John the new admin"
    content: `made ${identifier} the new admin`, 
    status: [{ userId: req.user._id, status: 'sent' }]
  });

  // 9. Aggregate to get the fully populated chat payload (avatars, names, etc.)
  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updatedChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(500, "Internal server error while fetching updated chat");
  }

  // 10. Socket Events Broadcast
  payload.participants?.forEach((participant) => {
    const pId = participant._id?.toString();
    
    // Update the UI so the "Admin" badge moves to the new user in the member list
    emitSocketEvent(req, pId, ChatEventEnum.UPDATE_GROUP_EVENT, payload);
    
    // Drop the system message into the chat window instantly
    emitSocketEvent(req, pId, ChatEventEnum.MESSAGE_RECEIVED_EVENT, systemMessage);
  });

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Admin rights transferred successfully"));
});

