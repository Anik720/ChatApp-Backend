const { default: mongoose } = require("mongoose");
const Room = require("../model/room");
const User = require("../model/user");

module.exports.get = async (req, res, next) => {
  try {
    const users = await User.find({
      $nor: [
        {
          type: "admin",
        },
      ],
    });
    return res.status(200).json({
      message: "Users fetched successfully",
      success: true,
      users,
    });
  } catch (error) {
    return res.status(400).json(error);
  }
};

module.exports.create = async (req, res, next) => {
  try {
    const { firstName, lastName, userName, email, password, phone } = req.body;

    const user = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (user) {
      if (user.email === email) {
        return res.status(400).json({
          message: "Email already exists",
          success: false,
        });
      }
      if (user.phone === phone) {
        return res.status(400).json({
          message: "Phone number already exists",
          success: false,
        });
      }
    }

    const newUser = new User({
      firstName,
      lastName,
      userName,
      email,
      password,
      phone,
    });
    const currentUser = await newUser.save();
    const res = await matrixClient.register(
      currentUser.userName,
      currentUser._id.toString()
    );

    //update the user with the matrix id
    await User.findByIdAndUpdate(currentUser._id, {
      matrixId: res.user_id,
    });

    return res.status(200).json({
      message: "User created successfully",
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, userName, email, password, phone } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(400).json({
        message: "User not found",
        success: false,
      });
    }

    const userExists = await User.findOne({
      $or: [{ email }, { phone }],
      $nor: [{ _id: id }],
    });

    if (userExists) {
      if (userExists.email === email) {
        return res.status(400).json({
          message: "Email already exists",
          success: false,
        });
      }
      if (userExists.phone === phone) {
        return res.status(400).json({
          message: "Phone number already exists",
          success: false,
        });
      }
    }

    user.firstName = firstName;
    user.lastName = lastName;
    user.userName = userName;
    user.email = email;
    user.password = password;
    user.phone = phone;

    await user.save();

    return res.status(200).json({
      message: "User updated successfully",
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = User.findById(id);

    if (!user) {
      return res.status(400).json({
        message: "User not found",
        success: false,
      });
    }
    await User.findByIdAndDelete(id);
    return res.status(200).json({
      message: "User deleted successfully",
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.searchUserByNickName = async (req, res) => {
  try {
    const { nickName } = req.params;
    
    let users = await User.find({
      nickName: { $regex: nickName, $options: "i" },
      $nor: [{ _id: req.user._id }],
    });


    users = await Promise.all(
      users.map(async (user) => {
        const room = await Room.findOne({
          members: { $all: [req.user._id, user._id] },
        });

        return {
          ...user._doc,
          roomId: room ? room._id : null,
        };
      })
    );

    return res.status(200).json({
      message: "Users fetched successfully",
      success: true,
      users,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.getUsersIfRoomExits = async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [{ host: req.user._id }, { members: req.user._id }],
      $nor: [{ isGroup: true }],
    });

    const users = await Promise.all(
      rooms.map(async (room) => {
        const user = await User.findOne({
          _id: {
            $in: room.members.map((member) => {
              if (member.toString() !== req.user._id.toString()) {
                return member;
              }
            }),
          },
        });
        return {
          ...user._doc,
          roomId: room._id,
        };
      })
    );

    return res.status(200).json({
      message: "Users fetched successfully",
      success: true,
      users,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};
