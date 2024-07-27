const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DeviceSchema = new Schema(
    {

        deviceInfo: {
            type: Object,
            required: false,
        },

    },
    { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const Device = mongoose.model("Device", DeviceSchema);
module.exports = Device;
