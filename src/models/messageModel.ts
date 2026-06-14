import { model, models, Schema, type InferSchemaType } from "mongoose";

enum MessageType {
  TEXT = "text",
  FILE = "file",
}

const messageParticipantSchema = new Schema(
  {
    id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    sender: {
      type: messageParticipantSchema,
      required: true,
    },

    receiver: {
      type: messageParticipantSchema,
      default: null,
    },

    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },

    messageType: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.TEXT,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for fast chat history retrieval
messageSchema.index({ conversation: 1, createdAt: 1 });

type MessageType_ = InferSchemaType<typeof messageSchema>;

const MessageModel =
  models.Message || model<MessageType_>("Message", messageSchema);

export default MessageModel;
export type { MessageType_ as MessageType };
export { MessageType as MessageTypeEnum };