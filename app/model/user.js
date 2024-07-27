const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: false,
    },
    nickName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: false,
      default: null,
    },
    phone: {
      type: String,
      required: false,
      unique: true,
      sparse: true
    },
    password: {
      type: String,
      required: false,
    },

    type: {
      type: String,
      required: false,
      default: "user",
      message: "User type is required",
      enum: {
        values: ["user", "admin", "guest", "moderator"],
        message: "User type must be user or admin or guest",
      },
    },
    status: {
      type: String,
      required: false,
      default: "pending",
      enum: {
        values: ["active", "inactive", "pending", "banned"],
        message: "Status must be active or inactive",
      },
    },
    chatRoomCount: {
      type: Number,
      required: false,
      default: 10,
    },

    individualChatCount: {
      type: Number,
      required: false,
      default: 10,
    },
    resetPasswordToken: {
      type: String,
      required: false,
    },
    resetPasswordExpire: {
      type: Date,
      required: false,
    },
    isEmailVerified: {
      type: Boolean,
      required: false,
      default: false,
    },
    matrixId: {
      type: String,
      required: false,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const User = mongoose.model("User", UserSchema);
module.exports = User;
