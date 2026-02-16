import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  fileUrl: { type: String, required: true },
  fileType: { type: String },
  fileSize: { type: Number }
});

const reactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reaction: { type: String },
});

const messageStatusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  seenAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  content: { type: String ,trim:true },
  pinned: { type: Boolean, default: false },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }, // Self-reference
  isDeleted: { type: Boolean, default: false },
  attachments: [attachmentSchema],
  reactions: [reactionSchema],
  status: [messageStatusSchema]
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
export {Message}