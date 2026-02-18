import { Chat } from "../models/chat.model.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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
        { user: req.user._id, role: "admin" },
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
    throw new ApiError(500, "Internal server error during aggregation");
  }

  // 6. Socket Logic: Notify all participants (except the creator)
  payload?.participants?.forEach((participant)=>{
    if(participant.user._id.tostring()=== req.user._id.tostring()) return;

    emitSocketEvent(
        req,
        participant.user._id.toString(),
        ChatEventEnum.NEW_CHAT_EVENT,
        payload
    );
  });

  return res
    .status(201)
    .json(new ApiResponse(201, payload, "Group chat created successfully"));
});


