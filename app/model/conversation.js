const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ConversationSchema = new Schema(
  {
    message: {
      type: String,
      required: true,
      message: "Message is required",
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    from: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      required: false,
      default: "sent",
      enum: {
        values: ["sent", "delivered", "seen"],
        message: "Status must be sent or delivered or seen",
      },
    },
    images: [
      {
        type: String,
        required: false,
        default: "null",
      },
    ],

    deletedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: false,
      },
    ],
    deletedByAdmin: {
      type: Boolean,
      required: false,
      default: false,
    },
    ip: {
      type: Schema.Types.ObjectId,
      ref: "Ip",
      required: false,
    },
    deviceInfo: {
      type: Schema.Types.ObjectId,
      ref: "Device",
      required: false,
    },

  },

  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const Conversation = mongoose.model("Conversation", ConversationSchema);
module.exports = Conversation;
