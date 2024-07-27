const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const IpSchema = new Schema(
  {
    ip: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: false,
      enum: ["active", "block"],
      default: "active",
    }
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const Ip = mongoose.model("Ip", IpSchema);
module.exports = Ip;
