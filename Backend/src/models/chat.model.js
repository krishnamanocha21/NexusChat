import mongoose from 'mongoose';

//remember the reference to the schema always stores the mongodb userid in it
const participantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now },
  leftAt: { type: Date }
});

const chatSchema = new mongoose.Schema({
  chatName: { type: String },
  isGroupChat: { type: Boolean, default: false },
  participants: [participantSchema],
  latestMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Chat = mongoose.model('Chat', chatSchema);


export {Chat};