const Conversation = require("../model/conversation");
const ImageApproval = require("../model/imageApproval");
const MessageApproval = require("../model/messageApproval");
const Room = require("../model/room");

module.exports.getRoom = async (req, res) => {
  try {
    let rooms = await Room.find({
      $or: [{ host: req.user._id }, { members: req.user._id }],
    }).sort({ updated_at: -1 });

    rooms = await Promise.all(
      rooms.map(async (room) => {
        const lastConversation = await Conversation.findOne({
          roomId: room._id,
        }).sort({ updated_at: -1 });

        return {
          ...room._doc,
          lastConversation: lastConversation ? lastConversation.message : "",
        };
      })
    );

    return res.status(200).json({
      message: "Room fetched successfully",
      success: true,
      rooms,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.getRoomByUserId = async (req, res) => {
  const { id } = req.params;

  try {
    const room = await Room.findOne({
      $and: [
        { $or: [{ host: req.user._id }, { members: req.user._id }] },
        { $or: [{ host: id }, { members: id }] },
      ],
    });
    if (!room) {
      return res.status(400).json({
        message: "Room not found",
        success: false,
      });
    }

    const conversation = await Conversation.find({
      roomId: room._id,
    })
      .populate("sender", "name email nickName")
      .sort({ updated_at: -1 });

    return res.status(200).json({
      message: "Room found",
      success: true,
      room,
      conversation,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.createGroupRoom = async (req, res) => {
  const { name, description, members, isPrivate } = req.body;
  console.log(75, req.user._id)
  try {
    const room = await Room.create({
      name,
      description,
      host: req.user._id,
      members: [...members, req.user._id],
      isGroup: true,
      isPrivate: isPrivate,
    });

    return res.status(200).json({
      message: "Group created successfully",
      success: true,
      room,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.joinGroup = async (req, res) => {
  const { roomId } = req.body;
  try {

    let room = await Room.findById(roomId)
    if (!room) {
      return res.status(400).json({
        message: "Room not found",
        success: false,
      });
    }

    if (room.isPrivate) {
      return res.status(400).json({
        message: "Room is private",
        success: false,
      });
    }

    if (room.members.includes(req.user._id)) {
      return res.status(400).json({
        message: "You are already a member",
        success: false,
      });
    }

    room.members.push(req.user._id);
    await room.save()

    room = await Room.findById(roomId).populate("host", "name email nickName").populate("members", "name email nickName")

    return res.status(200).json({
      message: "Joined successfully",
      success: true,
      room,
    });



  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });

  }
};

module.exports.leaveGroup = async (req, res) => {
  const { roomId } = req.body;

  try {

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(400).json({
        message: "Room not found",
        success: false,
      });
    }



    if (room.host.toString() === req.user._id.toString()) {

      return res.status(400).json({
        message: "Host cannot leave the room ",
        success: false,
      });

    }

    const newMembers = room.members.filter((member) => member.toString() != req.user._id.toString());

    room.members = newMembers;
    await room.save();



    return res.status(200).json({
      message: "You are successfully left the Graoup",
      success: true,
      room,
    });


  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });

  }
};

module.exports.deleteChat = async (req, res) => {
  const { roomId } = req.body;
  try {

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(400).json({
        message: "Room not found",
        success: false,
      });
    }

    room.deletedBy = [...room.deletedBy, req.user._id]
    await room.save();


    const conversation = await Conversation.find({ roomId: roomId });

    conversation.forEach(async (con) => {
      await Conversation.findByIdAndUpdate(con._id, { deletedBy: [...con.deletedBy, req.user._id] })
    })


    return res.status(200).json({
      message: "Chat deleted successfully",
      success: true,
      room,
    });


  } catch (error) {

    return res.status(400).json({
      message: error.message,
      success: false,
    });

  }
}
module.exports.publicRooms = async (req, res) => {
  const { roomId } = req.body;
  try {

    const rooms = await Room.find({isPrivate: false});

    if (!rooms) {
      return res.status(400).json({
        message: "Rooms not found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Public rooms fetched successfully",
      success: true,
      rooms,
    });


  } catch (error) {

    return res.status(400).json({
      message: error.message,
      success: false,
    });

  }
}
module.exports.getRooms = async (req, res) => {
  try {
    console.log(268, req.user._id)
    let rooms = await Room.find({
      $or: [{ host: req.user._id }, { members: req.user._id }],
      $nor: [{ deletedBy: req.user._id }],
    })
      .sort({ updated_at: -1 })
      .populate("members", "name email nickName phone status")
      .populate("host", "name email nickName phone");

   console.log(276, rooms)
    rooms = await Promise.all(
      rooms.map(async (room) => {
        const lastConversation = await Conversation.findOne({
          roomId: room._id,
        })
          .sort({ created_at: -1 })
          .populate("from", "name email nickName phone");

        const unseenMessageCount = await Conversation.countDocuments({
          roomId: room._id,
          status: "sent",
        });

        return {
          ...room.toObject(),
          lastConversation: lastConversation || {},
          unseenMessageCount: unseenMessageCount || 0,
        };
      })
    );

console.log(297, rooms)
    return res.status(200).json({
      message: "rooms fetched successfully",
      success: true,
      rooms,
    });

  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
}
module.exports.getImageApprovalList = async (req, res) => {
  const { userId } = req.query;

  try {

    const list = await ImageApproval.find({ recieverId: userId }).populate(["senderId", "recieverId"]);

    if (!list) {
      return res.status(400).json({
        message: "not found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "List  fetched successfully",
      success: true,
      list,
    });


  } catch (error) {

    return res.status(400).json({
      message: error.message,
      success: false,
    });

  }
}
module.exports.getMessageApprovalList = async (req, res) => {
  const { userId } = req.query;

  try {

    const list = await MessageApproval.find({ recieverId: userId }).populate(["senderId", "recieverId"]);

    if (!list) {
      return res.status(400).json({
        message: "not found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "List  fetched successfully",
      success: true,
      list,
    });


  } catch (error) {

    return res.status(400).json({
      message: error.message,
      success: false,
    });

  }
}
