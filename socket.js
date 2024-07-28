const jwt = require("jsonwebtoken");
const User = require("./app/model/user");
const Conversation = require("./app/model/conversation");
const Room = require("./app/model/room");
const Ip = require("./app/model/ip");
const MyDeviceDetector = require("./app/helpers/deviceDetector");
const Device = require("./app/model/device");
const imageUpload = require("./app/middleware/imageUploader");
const ImageApproval = require("./app/model/imageApproval");
function getCookieValue(cookieString, key) {
  const cookies = cookieString?.split("; ").reduce((acc, cookie) => {
    const [k, v] = cookie.split("=");
    acc[k] = v;
    return acc;
  }, {});
  return cookies && cookies[key];
}
const userSocketMap = new Map();

function removeBearerPrefix(token) {
  if (token && token.startsWith("Bearer%20")) {
    return token.slice(9);
  }
  return token;
}
const socket = async (io) => {
  const jwtMiddleware = (socket, next) => {
    const cookie = socket.handshake?.headers?.cookie;
    const token = getCookieValue(cookie, "authToken");
    const formetedToken = removeBearerPrefix(token);

    // remove bearer from token

    if (formetedToken) {
      jwt.verify(
        formetedToken,
        process.env.JWT_SECRET,
        async (err, decoded) => {
          if (err) {
            return next(new Error("Authentication error"));
          }
          socket.decoded = decoded;
          const user = await User.findById(decoded._id);
          if (!user) {
            return next(new Error("Authentication error"));
          }
          socket.user = user;
          next();
        }
      );
    } else {
      next(new Error("Authentication error"));
    }
  };

  io.use(jwtMiddleware);

  const getRooms = async (socket) => {
    try {
      let rooms = await Room.find({
        $or: [{ host: socket.user._id }, { members: socket.user._id }],
        $nor: [{ deletedBy: socket.user._id }],
      })
        .sort({ updated_at: -1 })
        .populate("members", "name email nickName phone status")
        .populate("host", "name email nickName phone");

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

      return rooms;
    } catch (error) {
      console.error("Error fetching rooms:", error);
      throw error;
    }
  };

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    userSocketMap.set(userId, socket.id);
    let rooms = await getRooms(socket);
    socket.emit("rooms", rooms);


    socket.on("publicRooms", async ({ type }) => {
      let publicRooms = await Room.find({
        isPrivate: false,
        isGroup: true,
        $nor: [{ host: socket.user._id }, { members: socket.user._id }],
      })
        .sort({ updated_at: -1 })
        .populate("members", "name email nickName phone")
        .populate("host", "name email nickName phone");

      publicRooms = await Promise.all(
        publicRooms.map(async (room) => {
          const lastConversation = await Conversation.findOne({
            roomId: room._id,
          })
            .sort({ created_at: -1 })
            .populate("from", "name email nickName");

          const undseenMessageCount = await Conversation.count({
            roomId: room._id,
            status: "sent",
          });

          return {
            ...room._doc,
            lastConversation: lastConversation ? lastConversation : {},
            undseenMessageCount: undseenMessageCount ? undseenMessageCount : 0,
          };
        })
      );
      socket.emit("publicRooms", publicRooms);
    });

    socket.on("joinRoom", async ({ roomId, isCurrent = false }) => {
      socket.join(roomId);
      socket.room = roomId;
      if (isCurrent) {
        const conversation = await Conversation.find({
          roomId: roomId,
          $nor: [{ deletedBy: socket.user._id }],
        })
          .populate("from roomId")
          .sort({ updated_at: -1 });

        const unSeenmessage = await Conversation.find({
          roomId: roomId,
          status: "sent",
        });
        // console.log(unSeenmessage);

        unSeenmessage.forEach(async (message) => {
          if (message.from.toString() !== socket.user._id.toString()) {
            await Conversation.findByIdAndUpdate(message._id, {
              status: "seen",
            });
          }
        });
        const infoImageApproval = await ImageApproval.findOne({roomId})

        socket.emit("preChat", {
          conversation,
          roomId,
          infoImageApproval,
        });

        socket.emit("rooms", rooms);
      }

      const memberSocketId = userSocketMap.get(socket.user._id.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("joined", roomId);
      }
    });

    socket.on("leaveRoom", ({ roomId }) => {
      socket.leave(roomId);
    });

    socket.on("message", async (data) => {
      const images = [];


      if (data.images) {
        data.images.map(async (image) => {
          const url = await imageUpload(image);
          console.log(url);
          images.push(url);
        });
      }

      let room;
      let roomId = data.roomId || null;

      try {
        if (!roomId) {
          room = await Room.findOne({
            members: { $all: data.members },
            isGroup: false,
          });

          if (!room) {
            room = new Room({
              members: data.members,
              host: socket.user._id,
              isGroup: false,
            });
            await room.save();
          }
          socket.join(room._id);
        } else {
          room = await Room.findById(roomId);
          if (room?.isPrivate && room.deletedBy) {
            await Room.findByIdAndUpdate(roomId, {
              deletedBy: [],
            });
          }
        }

        let senderStatus = socket?.user?.status;
        let recieverStatus = data?.members?.find((member) => {
          return member.status === "active";
        });
// //////////////////////////////////////////////////////////////
        if (senderStatus === "pending" && recieverStatus?.status === "active" && room?.isGroup === false) {

          data.members.forEach(async (member) => {
            const memberSocketId = userSocketMap.get(member._id || member);
            if (memberSocketId) {
              io.to(memberSocketId).emit("messageApprove", {
                roomId: room._id,
              });
            }
          });
          return;
        }

        // /////////////////////////////////////////////
        if (room?.isGroup === false && data?.images?.length > 0 && room?.imagesPermission?.active === false) {

          let senderID = socket?.user?._id;
          let recieverId = room?.members?.find((member) => {
            return member.toString() !== senderID.toString();
          });

          if (room?.imagesPermission?.active === false) {
            await ImageApproval.create({
              roomId: roomId,
              senderId: senderID,
              recieverId: recieverId
            })
            await Room.findByIdAndUpdate(roomId, {

              imagesPermission: {
                senderID: senderID,
                recieverId: recieverId,
              },
            });

            // update room updated_at
            await Room.findByIdAndUpdate(room?._id, {
              updated_at: Date.now(),
            });

            let ip;
            if (socket.handshake.headers["x-forwarded-for"]) {
              ip = socket.handshake.headers["x-forwarded-for"].split(",")[0];
            } else if (
              socket.handshake.connection &&
              socket.handshake.connection.remoteAddress
            ) {
              ip = socket.handshake.connection.remoteAddress;
            } else {
              ip = socket.handshake.address;
            }
            let existIp;

            existIp = await Ip.findOne({ ip: ip });

            if (!existIp) {
              existIp = new Ip({
                ip: ip,
              });
              await existIp.save();
            }

            const deviceDetect = MyDeviceDetector(socket.handshake);
            let device;
            device = await Device.findOne({ deviceInfo: deviceDetect });

            if (!device) {
              device = new Device({
                deviceInfo: deviceDetect,
              });
              await device.save();
            }



            data.members.forEach(async (member) => {
              const memberSocketId = userSocketMap.get(member._id || member);
              if (memberSocketId) {
                io.to(memberSocketId).emit("notifyMessageOfImages", {
                  roomId: room._id,
                  senderID: senderID,
                  recieverId: recieverId,
                  member: member,
                });
              }
              if (!data.roomId) {
                rooms = await getRooms(socket);
                const currentRoom = rooms.find((room) => {
                  room.roomId = room._id.toString();
                  return room?._id.toString() === room._id.toString();
                });

                io.to(memberSocketId).emit("rooms", rooms);
                io.to(memberSocketId).emit("setCurrentRoom", currentRoom);
              }
            });
          } 
        } 
        
        
        else {

          // update room updated_at
          await Room.findByIdAndUpdate(room?._id, {
            updated_at: Date.now(),
          });

          let ip;
          if (socket.handshake.headers["x-forwarded-for"]) {
            ip = socket.handshake.headers["x-forwarded-for"].split(",")[0];
          } else if (
            socket.handshake.connection &&
            socket.handshake.connection.remoteAddress
          ) {
            ip = socket.handshake.connection.remoteAddress;
          } else {
            ip = socket.handshake.address;
          }
          let existIp;

          existIp = await Ip.findOne({ ip: ip });

          if (!existIp) {
            existIp = new Ip({
              ip: ip,
            });
            await existIp.save();
          }

          const deviceDetect = MyDeviceDetector(socket.handshake);
          let device;
          device = await Device.findOne({ deviceInfo: deviceDetect });

          if (!device) {
            device = new Device({
              deviceInfo: deviceDetect,
            });
            await device.save();
          }

          const conversation = new Conversation({
            message: data.message,
            images: data.images,
            roomId: room._id,
            from: socket.user._id,
            ip: existIp._id,
            deviceInfo: device._id,
          });
       
          await conversation.save();

          const conversationPopulated = await Conversation.findById(
            conversation._id
          ).populate("from", "name email nickName");

          data.members.forEach(async (member) => {
            const memberSocketId = userSocketMap.get(member._id || member);
            if (memberSocketId) {
              io.to(memberSocketId).emit("notifyMessage", {
                conversation: conversationPopulated,
                roomId: room._id,
                member: member,
              });
              io.to(memberSocketId).emit("newMessage", {
                conversation: conversationPopulated,
                roomId: room._id,
              });
            }
            if (!data.roomId) {
              rooms = await getRooms(socket);
              const currentRoom = rooms.find((room) => {
                room.roomId = room._id.toString();
                return room?._id.toString() === room._id.toString();
              });
              io.to(memberSocketId).emit("rooms", rooms);
              io.to(memberSocketId).emit("setCurrentRoom", currentRoom);
            }
          });
        }
      } catch (error) {
        console.log(error);
      }
    });
    socket.on("startTyping", async ({ roomId }) => {
      const rooms = await Room.findById(roomId);
      if (!rooms) return;
      const members = rooms.members.filter(
        (member) => member.toString() !== socket.user._id.toString()
      );
      members.forEach(async (member) => {
        const memberSocketId = userSocketMap.get(member.toString());
        io.to(memberSocketId).emit("startTyping", {
          roomId,
          userId: socket.user._id,
        });
      });
    });
    socket.on("stopTyping", async ({ roomId }) => {
      const rooms = await Room.findById(roomId);
      if (!rooms) return;
      const members = rooms.members.filter(
        (member) => member.toString() !== socket.user._id.toString()
      );
      members.forEach(async (member) => {
        const memberSocketId = userSocketMap.get(member.toString());
        io.to(memberSocketId).emit("stopTyping", {
          roomId,
          userId: socket.user._id,
        });
      });
    });

    socket.on("imagePermission", async ({ roomId,senderid, recieverid }) => {
      console.log(439, roomId,senderid, recieverid )
      
      const result = await Room.findByIdAndUpdate(roomId, {
        imagesPermission: {
          active: true,
        },
      })
      const result2 = await ImageApproval.findOneAndUpdate(
        { roomId: roomId }, // filter object
        { status: true }, // update object
        { new: true } // options to return the updated document
      );

      console.log(448, result2)
      console.log(453, result)



      result &&  result?.members.forEach(async (member) => {
        const memberSocketId = userSocketMap.get(member.toString());
        io.to(memberSocketId).emit("imagePermissionApproved",roomId, senderid, recieverid)
      });

      // if(result2){
      //   let arr = [senderid, recieverid]
      //   arr?.forEach(async (member) => {
      //     const memberSocketId = userSocketMap.get(member.toString());
      //     io.to(memberSocketId).emit("imagePermissionApproved",roomId, senderid, recieverid)
      //   });
  
      // }

  

    });

    // // acceptRoom;
    // socket.on("acceptRoom", async ({ roomId }) => {
    //   let room;
    //   room = await Room.findByIdAndUpdate(roomId, {
    //     isAccepted: true,
    //   })
    //     .populate("members", "name email nickName phone")
    //     .populate("host", "name email nickName phone");
    //   const lastConversation = await Conversation.findOne({
    //     roomId: room._id,
    //   }).sort({ updated_at: -1 });

    //   room = {
    //     ...room._doc,
    //     isAccepted: true,
    //     lastConversation: lastConversation ? lastConversation.message : "",
    //   };

    //   socket.emit("updateRoom", room);
    // });

    // // join Group

    socket.on("joinGroup", async ({ roomId }) => {
      let room;
      const resRoomMember = await Room.findById(roomId);
      room = await Room.findByIdAndUpdate(roomId, {
        isAccepted: true,
        members: [...resRoomMember.members, socket.user._id],
      })
        .populate("members", "name email nickName phone")
        .populate("host", "name email nickName phone");
      const lastConversation = await Conversation.findOne({
        roomId: room._id,
      }).sort({ updated_at: -1 });

      room = {
        ...room._doc,
        isAccepted: true,
        lastConversation: lastConversation ? lastConversation.message : "",
      };

      socket.emit("rooms", rooms);
    });

    // socket.on("leaveGroup", async ({ roomId }) => {
    //   let room;
    //   room = await Room.findById(roomId);

    //   const isHost = room?.host?.toString() === socket.user._id.toString()

    //   if (isHost) {
    //     room = await Room.findByIdAndUpdate(roomId, {
    //       $pull: { members: socket.user._id },

    //     })
    //     room = await Room.findByIdAndUpdate(roomId, {
    //       host: room.members[0]
    //     })
    //       .populate("members", "name email nickName phone")
    //       .populate("host", "name email nickName phone");

    //   } else {
    //     room = await Room.findByIdAndUpdate(roomId, {
    //       $pull: { members: socket.user._id },

    //     }).populate("members", "name email nickName phone")
    //       .populate("host", "name email nickName phone");
    //   }

    //   socket.emit("rooms", rooms);

    // });

    // socket.on("allConversations", async () => {
    //   const conversation = await Conversation.find().sort({ updated_at: -1 });

    //   socket.emit("allConversations", conversation);
    // });

    socket.on("disconnect", () => {
      userSocketMap.delete(userId);
    });
  });
};

module.exports = socket;
