const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MessageApprovalSchema = new Schema(
  {
    status: {
      type: Boolean,
      required: false,
      default: false,
    },

    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recieverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },

  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const MessageApproval = mongoose.model("MessageApproval", MessageApprovalSchema);
module.exports = MessageApproval;
