const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const RoomSchema = new Schema(
  {
    name: {
      type: String,
      required: false,
      default: "null",
    },
    description: {
      type: String,
      required: false,
    },

    isPrivate: {
      type: Boolean,
      required: false,
      default: true,
    },
    imagesPermission: {
      active: {
        type: Boolean,
        required: false,
        default: false,
      },
      senderID: String,
      recieverId: String,
    },
    isGroup: {
      type: Boolean,
      required: false,
      default: false,
    },
    isAccepted: {
      type: Boolean,
      required: false,
      default: false,
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: false,
      },
    ],
    deletedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: false,
      },
    ],
    isFileAccepted: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const Room = mongoose.model("Room", RoomSchema);
module.exports = Room;
