import { model, models, Schema, type InferSchemaType } from "mongoose";

enum ConversationType {
  COURSE_PUBLIC = "coursePublicChat",
  PRIVATE_1V1 = "coursePrivateChat",
}

const conversationSchema = new Schema(
  {
    conversationType: {
      type: String,
      enum: Object.values(ConversationType),
      required: true,
      lowercase: true,
    },

    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },

    privateChatConversationId: {
      type: String,
      unique: true,
      index: true,
      default: null,
    },

    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

type ConversationType_ = InferSchemaType<typeof conversationSchema>;

const ConversationModel =
  models.Conversation ||
  model<ConversationType_>("Conversation", conversationSchema);

export default ConversationModel;
export type { ConversationType_ as ConversationType };
export { ConversationType as ConversationTypeEnum };
