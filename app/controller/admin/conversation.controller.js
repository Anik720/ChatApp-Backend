const { default: mongoose } = require("mongoose");
const Ip = require("../../model/ip");
const Conversation = require("../../model/conversation");

module.exports.getAllConversation = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const options = {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
    };

    const conversations = await Conversation.find({}).sort({
      created_at: -1,
    }).populate("from", "name email nickName").populate("roomId", "name members isGroup").populate("ip", "ip status")

    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.getAllConversationByFilter = async (req, res, next) => {

  const { userId, ipId, roomId } = req.params;

  try {
    let conversations = await Conversation.find({}).sort({
      created_at: -1,
    }).populate("from", "name email nickName").populate("roomId", "name members isGroup").populate("ip", "ip status")



    if (roomId !== "undefined") {
      conversations = await Conversation.find({
        roomId: new mongoose.Types.ObjectId(roomId),
      }).sort({
        created_at: -1,
      }).populate("from", "name email nickName").populate("roomId", "name members isGroup").populate("ip", "ip status")

    }

    if (userId !== "undefined") {
      conversations = await Conversation.find({
        from: new mongoose.Types.ObjectId(userId),
      }).sort({
        created_at: -1,
      }).populate("from", "name email nickName").populate("roomId", "name members isGroup").populate("ip", "ip status")

    }


    if (ipId !== "undefined") {
      conversations = await Conversation.find({
        ip: new mongoose.Types.ObjectId(ipId),
      }).sort({
        created_at: -1,
      }).populate("from", "name email nickName").populate("roomId", "name members isGroup").populate("ip", "ip status")

    }





    if (roomId !== "undefined" && userId !== "undefined") {
      conversations = await Conversation.find({
        $and: [
          {
            roomId: new mongoose.Types.ObjectId(roomId),
          },
          {
            from: new mongoose.Types.ObjectId(userId),
          },
        ],
      }).sort({
        created_at: -1,
      }).populate("from", "name email nickName").populate("roomId", "name members isGroup").populate("ip", "ip status")

    }

    if (roomId !== "undefined" && ipId !== "undefined") {
      conversations = await Conversation.find({
        $and: [
          {
            roomId: new mongoose.Types.ObjectId(roomId),
          },
          {
            ip: new mongoose.Types.ObjectId(ipId),
          },
        ],
      }).sort({
        created_at: -1,

      }).populate("from", "name email nickName").populate("roomId", "name members isGroup").populate("ip", "ip status")

    }

    if (userId !== "undefined" && ipId !== "undefined") {
      conversations = await Conversation.find({
        $and: [
          {
            from: new mongoose.Types.ObjectId(userId),
          },
          {
            ip: new mongoose.Types.ObjectId(ipId),
          },
        ],
      }).sort({
        created_at: -1,
      }).populate("from", "name email nickName").populate("roomId", "name members isGroup").populate("ip", "ip status")

    }

    if (userId !== "undefined" && ipId !== "undefined" && roomId !== "undefined") {
      conversations = await Conversation.find({
        $and: [
          {
            roomId: new mongoose.Types.ObjectId(roomId),
          },
          {
            ip: new mongoose.Types.ObjectId(ipId),
          },
          {
            from: new mongoose.Types.ObjectId(userId),
          },
        ],
      }).sort({
        created_at: -1,
      }).populate("from", "name email nickName").populate("roomId", "name members isGroup").populate("ip", "ip status")

    }


    return res.status(200).json({
      success: true,
      conversations,
    });
  }
  catch (error) {
    console.log('first error', error)
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }


}

module.exports.deleteConversation = async (req, res, next) => {
  try {
    const { cid } = req.params;
    const conversation = await Conversation.findById(cid);
    if (!conversation) {
      return res.status(400).json({
        message: "Conversation not found",
        success: false,
      });
    }

    conversation.deletedByAdmin = true;
    await conversation.save();

    return res.status(200).json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({
      message: 'something went wrong',
      success: false,
    });
  }
}
