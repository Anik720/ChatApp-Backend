const User = require("../../model/user");
const Room = require("../../model/room");
const Conversation = require("../../model/conversation");

module.exports.get = async (req, res, next) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const status = req.query.status || "active";

  try {

    let users = await User.find({
      $nor: [{ type: "admin" }],
    }, { password: 0 }).limit(parseInt(limit)).sort({ created_at: -1 }).skip((parseInt(page) - 1) * parseInt(limit)).exec();

    if (status !== "all") {
      users = await User.find({
        $nor: [{ type: "admin" }],
        status,
      }, { password: 0 }).limit(parseInt(limit)).sort({ created_at: -1 }).skip((parseInt(page) - 1) * parseInt(limit)).exec();

    }
    if (status !== "banned") {
      users = await User.find({
        $nor: [{ type: "admin" }],
      }, { password: 0 }).limit(parseInt(limit)).sort({ created_at: -1 }).skip((parseInt(page) - 1) * parseInt(limit)).exec();

    }

    const total = await User.countDocuments({
      $nor: [{ type: "admin" }],
    })
    return res.status(200).json({
      message: "Users fetched successfully",
      success: true,
      users,
      total,
    });
  } catch (error) {
    console.log('error', error)
    return res.status(400).json(error);
  }
};

module.exports.banned = async (req, res, next) => {
  try {
    const { id } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(400).json({
        message: "User not found",
        success: false,
      });
    }

    if (user.status === "banned") {
      return res.status(400).json({
        message: "User already banned",
        success: false,
      });
    }

    user.status = "banned";
    await user.save();
    return res.status(200).json({
      message: "User banned successfully",
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.unbanned = async (req, res, next) => {
  try {
    const { id } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(400).json({
        message: "User not found",
        success: false,
      });
    }

    if (user.status === "active") {
      return res.status(400).json({
        message: "User already active",
        success: false,
      });
    }

    user.status = "active";
    await user.save();

    return res.status(200).json({
      message: "User unbanned successfully",
      success: true,
    });


  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.getRoomsByUserId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rooms = await Room.find({
      $or: [
        {
          host: id,
        },
        {
          members: id,
        },
      ],
    }).populate("members", "name email nickName");
    return res.status(200).json({
      message: "Rooms fetched successfully",
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

module.exports.getConversationByRoomId = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.find({
      roomId: id,
    })
      .populate("from", "name email nickName")
      .sort({ updated_at: -1 });
    return res.status(200).json({
      message: "Conversation fetched successfully",
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

module.exports.getAllUser = async (req, res) => {
  try {
    const users = await User.find({
      $nor: [{ type: "admin" }],
    }, { password: 0 }).sort({ created_at: -1 }).exec();
    return res.status(200).json({
      message: "Users fetched successfully",
      success: true,
      users,
    });
  } catch (error) {
    return res.status(400).json(error);
  }
}
