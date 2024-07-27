const Conversation = require("../model/conversation");
const Room = require("../model/room");
const User = require("../model/user");
var mongoose = require("mongoose");

module.exports.get = async (req, res) => {
  try {
    console.log("first");
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.create = async (req, res) => {
  const { receiver, message } = req.body;
  const rec = new mongoose.Types.ObjectId(receiver);
  try {
    let room = await Room.findOne({
      $and: [
        { $or: [{ host: req.user._id }, { members: req.user._id }] },
        { $or: [{ host: rec }, { members: rec }] },
      ],
    });

    const roomName = await User.findById(receiver);

    if (!room) {
      room = new Room({
        members: [receiver],
        host: req.user._id,
        name: roomName.name,
        to: req.user.name,
        from: roomName.name,
      });
    }

    room.updated_at = Date.now();
    await room.save();

    const conversation = new Conversation({
      sender: req.user._id,
      receiver,
      message,
      roomId: room._id,
    });
    await conversation.save();

    return res.status(200).json({
      message: "Conversation created successfully",
      success: true,
      conversation,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

//delete conversation
module.exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findById(id);
    if
      (!conversation) {
      return res.status(400).json({
        message: "Conversation not found",
        success: false,
      });
    }
    await Conversation.findByIdAndDelete(id);
    return res.status(200).json({
      message: "Conversation deleted successfully",
      success: true,
    });
  }
  catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
}
