const jwt = require("jsonwebtoken");
const User = require("./app/model/user");
const Conversation = require("./app/model/conversation");
const Room = require("./app/model/room");
const Ip = require("./app/model/ip");
const MyDeviceDetector = require("./app/helpers/deviceDetector");
const Device = require("./app/model/device");
const imageUpload = require("./app/middleware/imageUploader");
const ImageApproval = require("./app/model/imageApproval");
const MessageApproval = require("./app/model/messageApproval");
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

  // const getRooms = async (socket) => {
  //   try {
  //     let rooms = await Room.find({
  //       $or: [{ host: socket.user._id }, { members: socket.user._id }],
  //       $nor: [{ deletedBy: socket.user._id }],
  //     })
  //       .sort({ updated_at: -1 })
  //       .populate("members", "name email nickName phone status")
  //       .populate("host", "name email nickName phone");

  //     rooms = await Promise.all(
  //       rooms.map(async (room) => {
  //         const lastConversation = await Conversation.findOne({
  //           roomId: room._id,
  //         })
  //           .sort({ created_at: -1 })
  //           .populate("from", "name email nickName phone");

  //         const unseenMessageCount = await Conversation.countDocuments({
  //           roomId: room._id,
  //           status: "sent",
  //         });

  //         return {
  //           ...room.toObject(),
  //           lastConversation: lastConversation || {},
  //           unseenMessageCount: unseenMessageCount || 0,
  //         };
  //       })
  //     );

  //     return rooms;
  //   } catch (error) {
  //     console.error("Error fetching rooms:", error);
  //     throw error;
  //   }
  // };

  const getRooms = async (socket) => {
    try {
      // Fetch all rooms with lean and necessary fields only
      let rooms = await Room.find({
        $or: [{ host: socket.user._id }, { members: socket.user._id }],
        $nor: [{ deletedBy: socket.user._id }],
      })
        .sort({ updated_at: -1 })
        .populate("members", "name email nickName phone status")
        .populate("host", "name email nickName phone")
        .lean();
  
      // Ensure messagePermission.active is present
      rooms = rooms.map((room) => {
        // Initialize messagePermission if it doesn't exist
        if (!room.messagePermission) {
          room.messagePermission = { active: false };
        }
        // Initialize messagePermission.active if undefined
        else if (room.messagePermission.active === undefined) {
          room.messagePermission.active = false;
        }
        // Preserve the true value if it's already set
        return room;
      });
  
      // Get all room IDs
      const roomIds = rooms.map((room) => room._id);
  
      // Fetch last conversations for all rooms in one query
      const lastConversations = await Conversation.aggregate([
        { $match: { roomId: { $in: roomIds } } },
        { $sort: { created_at: -1 } },
        {
          $group: {
            _id: "$roomId",
            doc: { $first: "$$ROOT" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "doc.from",
            foreignField: "_id",
            as: "fromUser",
          },
        },
        { $unwind: "$fromUser" },
        {
          $project: {
            message: "$doc.message",
            from: {
              name: "$fromUser.name",
              email: "$fromUser.email",
              nickName: "$fromUser.nickName",
              phone: "$fromUser.phone",
            },
            created_at: "$doc.created_at",
          },
        },
      ]);
  
      // Create a map of roomId to lastConversation
      const lastConversationsMap = lastConversations.reduce((acc, conversation) => {
        acc[conversation._id] = conversation;
        return acc;
      }, {});
  
      // Fetch unseen message counts for all rooms in one query
      const unseenMessages = await Conversation.aggregate([
        { $match: { roomId: { $in: roomIds }, status: "sent" } },
        {
          $group: {
            _id: "$roomId",
            count: { $sum: 1 },
          },
        },
      ]);
  
      // Create a map of roomId to unseenMessageCount
      const unseenMessageCountMap = unseenMessages.reduce((acc, unseen) => {
        acc[unseen._id] = unseen.count;
        return acc;
      }, {});
  
      // Map rooms with their last conversation and unseen message count
      rooms = rooms.map((room) => {
        return {
          ...room,
          lastConversation: lastConversationsMap[room._id] || {},
          unseenMessageCount: unseenMessageCountMap[room._id] || 0,
        };
      });
  
      return rooms;
    } catch (error) {
      console.error("Error fetching rooms:", error);
      throw error;
    }
  };
  
  
  const getRoomsById = async (socket) => {
    try {
      // Fetch all rooms with lean and necessary fields only
      let rooms = await Room.find({
        $or: [{ host: socket.user._id }, { members: socket.user._id }],
        $nor: [{ deletedBy: socket.user._id }],
      })
        .sort({ updated_at: -1 })
        .populate("members", "name email nickName phone status")
        .populate("host", "name email nickName phone")
        .lean();
  
      // Ensure messagePermission.active is present
      rooms = rooms.map((room) => {
        // Initialize messagePermission if it doesn't exist
        if (!room.messagePermission) {
          room.messagePermission = { active: false };
        }
        // Initialize messagePermission.active if undefined
        else if (room.messagePermission.active === undefined) {
          room.messagePermission.active = false;
        }
        // Preserve the true value if it's already set
        return room;
      });
  
      // Get all room IDs
      const roomIds = rooms.map((room) => room._id);
  
      // Fetch last conversations for all rooms in one query
      const lastConversations = await Conversation.aggregate([
        { $match: { roomId: { $in: roomIds } } },
        { $sort: { created_at: -1 } },
        {
          $group: {
            _id: "$roomId",
            doc: { $first: "$$ROOT" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "doc.from",
            foreignField: "_id",
            as: "fromUser",
          },
        },
        { $unwind: "$fromUser" },
        {
          $project: {
            message: "$doc.message",
            from: {
              name: "$fromUser.name",
              email: "$fromUser.email",
              nickName: "$fromUser.nickName",
              phone: "$fromUser.phone",
            },
            created_at: "$doc.created_at",
          },
        },
      ]);
  
      // Create a map of roomId to lastConversation
      const lastConversationsMap = lastConversations.reduce((acc, conversation) => {
        acc[conversation._id] = conversation;
        return acc;
      }, {});
  
      // Fetch unseen message counts for all rooms in one query
      const unseenMessages = await Conversation.aggregate([
        { $match: { roomId: { $in: roomIds }, status: "sent" } },
        {
          $group: {
            _id: "$roomId",
            count: { $sum: 1 },
          },
        },
      ]);
  
      // Create a map of roomId to unseenMessageCount
      const unseenMessageCountMap = unseenMessages.reduce((acc, unseen) => {
        acc[unseen._id] = unseen.count;
        return acc;
      }, {});
  
      // Map rooms with their last conversation and unseen message count
      rooms = rooms.map((room) => {
        return {
          ...room,
          lastConversation: lastConversationsMap[room._id] || {},
          unseenMessageCount: unseenMessageCountMap[room._id] || 0,
        };
      });
  
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
  //   socket.on("rooms", (allrooms) => {
  //     console.log(66, rooms)
  //     rooms= allrooms
  // });
    

    // socket.on("joinRoom", async ({ roomId, isCurrent = false }) => {
    //   console.log(180, "joinRoom")
    //   socket.join(roomId);
    //   socket.room = roomId;
    //   if (isCurrent) {
    //     const conversation = await Conversation.find({
    //       roomId: roomId,
    //       $nor: [{ deletedBy: socket.user._id }],
    //     })
    //       .populate("from roomId")
    //       .sort({ updated_at: -1 });

    //     const unSeenmessage = await Conversation.find({
    //       roomId: roomId,
    //       status: "sent",
    //     });
    //     // console.log(unSeenmessage);

    //     unSeenmessage.forEach(async (message) => {
    //       if (message.from.toString() !== socket.user._id.toString()) {
    //         await Conversation.findByIdAndUpdate(message._id, {
    //           status: "seen",
    //         });
    //       }
    //     });
    //     const infoImageApproval = await ImageApproval.findOne({ roomId });
    //     const infoMessageApproval = await MessageApproval.findOne({ roomId });
    //     const curreentRoom = await Room.findOne({ _id: roomId });

    //     socket.emit("preChat", {
    //       conversation,
    //       roomId,
    //       infoImageApproval,
    //       curreentRoom,
    //       infoMessageApproval
    //     });

    //     const allRooms = await getRooms(socket);

    //     socket.emit("rooms", allRooms);
    //   }

    //   const memberSocketId = userSocketMap.get(socket.user._id.toString());
    //   if (memberSocketId) {
    //     io.to(memberSocketId).emit("joined", roomId);
    //   }
    // });
    socket.on("joinRoom", async ({ roomId, isCurrent = false }) => {
      console.log(180, "joinRoom");
      socket.join(roomId);
      socket.room = roomId;
    
      if (isCurrent) {
        // Parallelizing data fetching
        const [
          conversation,
          unseenMessages,
          infoImageApproval,
          infoMessageApproval,
          curreentRoom
        ] = await Promise.all([
          Conversation.find({
            roomId: roomId,
            $nor: [{ deletedBy: socket.user._id }],
          })
            .populate("from roomId")
            .sort({ updated_at: -1 }),
          
          Conversation.find({
            roomId: roomId,
            status: "sent",
            from: { $ne: socket.user._id }, // Only messages from other users
          }),
          
          ImageApproval.findOne({ roomId }),
          MessageApproval.findOne({ roomId }),
          Room.findById(roomId)
        ]);
    
        // Bulk update unseen messages to "seen" status
        if (unseenMessages.length > 0) {
          await Conversation.updateMany(
            { _id: { $in: unseenMessages.map(msg => msg._id) } },
            { status: "seen" }
          );
        }
    
        // Emit preChat data
        socket.emit("preChat", {
          conversation,
          roomId,
          infoImageApproval,
          curreentRoom,
          infoMessageApproval
        });
    
        // Fetch and emit all rooms data
        const allRooms = await getRooms(socket);
        socket.emit("rooms", allRooms);
      }
    
      // Notify other members in the room
      const memberSocketId = userSocketMap.get(socket.user._id.toString());
      if (memberSocketId) {
        io.to(memberSocketId).emit("joined", roomId);
      }
    });
    

    socket.on("leaveRoom", ({ roomId }) => {
      socket.leave(roomId);
    });
    socket.on("mergeRooms",async ({ rooms }) => {
      let allrooms = await getRooms(socket);
      console.log(225, rooms)
      socket.emit("rooms", allrooms);

    });
    socket.on("allRoomGetTrigger",async ( user ) => {
      let obj = {
        user: {
          _id: user?._id
        },
        
      }
      let allrooms = await getRoomsById(obj);
      console.log(452, user)
      const memberSocketId = userSocketMap.get(user._id || member);
      socket.emit("rooms", allrooms);

    });

    socket.on("message", async (data) => {
      const images = [];

      if (data.images) {
        data.images.map(async (image) => {
          const url = await imageUpload(image);
          images.push(url);
        });
      }

      let room;
      let roomId = data.roomId || null;
      console.log(195, room);



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
        let recieverStatus = await  User.findOne({
          _id: { $in: data.members },  // Match if the _id is in the array
          status: 'active'          // Match if the status is 'active'
        }).lean()

        // //////////////////////////////////////////////////////////////
        if (
          senderStatus === "pending" &&
          recieverStatus?.status === "active" &&
          room?.isGroup === false &&
          room?.messagePermission?.active === false
        ) {

            await Room.findOneAndUpdate(
            { _id:  room._id }, // Query to find the room by its ID
            {
              messagePermission: {
                senderID: socket?.user?._id,
                recieverId: recieverStatus?._id,
              },
            },
            { new: true } // Option to return the updated document
          );

          const res = await MessageApproval.findOne({
            roomId:  room._id,
            senderId: socket?.user?._id,
            recieverId: recieverStatus?._id,
          });
          if (!res) {
            await MessageApproval.create({
              roomId:  room._id,
              senderId: socket?.user?._id,
              recieverId: recieverStatus?._id,
            });
          }
       
          let findSender = await User.findOne({
            _id: socket?.user?._id,
          })

          data.members.forEach(async (member) => {
            const memberSocketId = userSocketMap.get(member._id || member);
            // let allrooms = await getRooms(socket);
            // // console.log(268, allrooms)
            // socket.emit("rooms", allrooms);
            if (memberSocketId) {
              io.to(memberSocketId).emit("messageApprove", {
                roomId: room._id,
                senderId: socket?.user?._id,
                recieverId: recieverStatus?._id,
                room,
                senderInfo: findSender,
                recieverInfo: recieverStatus
              });
              if(member?._id == recieverStatus?._id){
                let obj = {
                  user: {
                    _id: recieverStatus?._id
                  },
                  
                }
                rooms = await getRoomsById(obj);
              }else{
                rooms = await getRooms(socket);
              }
             if(!data?.roomId){
              const currentRoom = rooms.find((room) => {
                room.roomId = room._id.toString();
                return room?._id.toString() === room._id.toString();
              });
              io.to(memberSocketId).emit("rooms", rooms);
              io.to(memberSocketId).emit("setCurrentRoom", currentRoom);
             }

            }
          });
          return;
        }

        // /////////////////////////////////////////////
        if (
          room?.isGroup === false &&
          data?.images?.length > 0 &&
          room?.imagesPermission?.active === false
        ) {
          let senderID = socket?.user?._id;
          let recieverId = room?.members?.find((member) => {
            return member.toString() !== senderID.toString();
          });

          if (room?.imagesPermission?.active === false) {

            const res = await ImageApproval.findOne({
              roomId:  room._id.toString(),
              senderId: senderID,
              recieverId: recieverId,
            });
            if (!res) {
              await ImageApproval.create({
                roomId:  room._id.toString(),
                senderId: senderID,
                recieverId: recieverId,
              });
            }

            await Room.findByIdAndUpdate( room._id, {
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
              rooms = await getRooms(socket);
              const currentRoom = rooms.find((room) => {
                room.roomId = room._id.toString();
                return room?._id.toString() === room._id.toString();
              });
              if (memberSocketId) {
                io.to(memberSocketId).emit("notifyMessageOfImages", {
                  roomId: room._id,
                  senderID: senderID,
                  recieverId: recieverId,
                  member: member,
                  presentRoom: currentRoom,
                });
              }
              if (!data.roomId) {
                io.to(memberSocketId).emit("rooms", rooms);
                io.to(memberSocketId).emit("setCurrentRoom", currentRoom);
              }
            });
          }
        }
        
        else {
          // update room updated_at
          if(room?._id){
            await Room.findByIdAndUpdate(room?._id, {
              updated_at: Date.now(),
            });
          }
    

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

          let findRoom 
          if(room?._id){
             findRoom = await Room.findById({_id : room._id}).populate('members')

          }
          const memberIds = findRoom?.members?.map(member => member?._id.toString() );
         findRoom.members = memberIds

         findRoom?.members.forEach(async (member) => {
            const memberSocketId = userSocketMap.get(member._id?.toString() || member);
            
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

    // socket.on("message", async (data) => {
    //   const images = [];
    //   try {
    //     // Image upload handling in parallel using Promise.all
    //     if (data.images && data.images.length > 0) {
    //       images.push(...await Promise.all(data.images.map(image => imageUpload(image))));
    //     }
    
    //     let room;
    //     const roomId = data.roomId || null;
    
    //     if (!roomId) {
    //       // Find or create a private room
    //       room = await Room.findOne({
    //         members: { $all: data.members },
    //         isGroup: false,
    //       });
    
    //       if (!room) {
    //         room = new Room({
    //           members: data.members,
    //           host: socket.user._id,
    //           isGroup: false,
    //         });
    //         await room.save();
    //       }
    //       socket.join(room._id);
    //     } else {
    //       room = await Room.findById(roomId);
    //       if (room?.isPrivate && room.deletedBy) {
    //         await Room.findByIdAndUpdate(roomId, { deletedBy: [] });
    //       }
    //     }
    
    //     // Optimized querying for sender and receiver status
    //     const [senderStatus, receiver] = await Promise.all([
    //       socket?.user?.status,
    //       User.findOne({
    //         _id: { $in: data.members },
    //         status: "active"
    //       }).lean(),
    //     ]);
    
    //     // Approval logic block
    //     if (
    //       senderStatus === "pending" &&
    //       receiver?.status === "active" &&
    //       room?.isGroup === false &&
    //       room?.messagePermission?.active === false
    //     ) {
    //       await handlePendingApproval(room, socket.user._id, receiver._id, socket, data.members);
    //       return;
    //     }
    
    //     // Image approval logic block
    //     if (
    //       room?.isGroup === false &&
    //       data?.images?.length > 0 &&
    //       room?.imagesPermission?.active === false
    //     ) {
    //       await handleImageApproval(room, socket, data.members);
    //     } else {
    //       await handleMessage(room, data, socket);
    //     }
    //   } catch (error) {
    //     console.error("Error handling message:", error);
    //   }
    // });
    
    // // Helper function to handle pending message approval
    // const handlePendingApproval = async (room, senderId, receiverId, socket, members) => {
    //   await Room.findOneAndUpdate(
    //     { _id: room._id },
    //     { messagePermission: { senderID: senderId, receiverId } },
    //     { new: true }
    //   );
    
    //   const res = await MessageApproval.findOne({
    //     roomId: room._id,
    //     senderId,
    //     receiverId,
    //   });
    
    //   if (!res) {
    //     await MessageApproval.create({ roomId: room._id, senderId, receiverId });
    //   }
    
    //   const findSender = await User.findById(senderId);
    //   notifyMembers("messageApprove", room, findSender, receiverId, members, socket);
    // };
    
    // // Helper function to handle image approval
    // const handleImageApproval = async (room, socket, members) => {
    //   const senderId = socket?.user?._id;
    //   const receiverId = room?.members.find((member) => member.toString() !== senderId.toString());
    
    //   if (!await ImageApproval.findOne({ roomId: room._id, senderId, receiverId })) {
    //     await ImageApproval.create({ roomId: room._id, senderId, receiverId });
    //   }
    
    //   await Room.findByIdAndUpdate(room._id, {
    //     imagesPermission: { senderID: senderId, receiverId },
    //     updated_at: Date.now(),
    //   });
    
    //   const { ip, device } = await logIpAndDeviceInfo(socket);
    //   notifyMembers("notifyMessageOfImages", room, senderId, receiverId, members, socket, { ip, device });
    // };
    
    // // Helper function to handle normal message flow
    // const handleMessage = async (room, data, socket) => {
    //   await Room.findByIdAndUpdate(room?._id, { updated_at: Date.now() });
    
    //   const { ip, device } = await logIpAndDeviceInfo(socket);
    //   const conversation = new Conversation({
    //     message: data.message,
    //     images: data.images,
    //     roomId: room._id,
    //     from: socket.user._id,
    //     ip: ip._id,
    //     deviceInfo: device._id,
    //   });
    
    //   await conversation.save();
    //   const conversationPopulated = await Conversation.findById(conversation._id).populate("from", "name email nickName");
    
    //   const roomData = await Room.findById(room._id).populate("members");
    //   const memberIds = roomData?.members?.map(member => member._id.toString());
    
    //   notifyMembers("notifyMessage", room, conversationPopulated, memberIds, socket);
    // };
    
    // // Helper function to notify all room members
    // const notifyMembers = async (event, room, data, members, socket, additionalData = {}) => {
      
    //   await Promise.all(members.map(async (member) => {
    //     const memberSocketId = userSocketMap.get(member._id || member);
    //     if (memberSocketId) {
    //       io.to(memberSocketId).emit(event, { roomId: room._id, ...data, ...additionalData });
    //       if (!data.roomId) {
    //         const rooms = await getRooms(socket);
    //         const currentRoom = rooms.find((r) => r._id.toString() === room._id.toString());
    //         io.to(memberSocketId).emit("rooms", rooms);
    //         io.to(memberSocketId).emit("setCurrentRoom", currentRoom);
    //       }
    //     }
    //   }));
    // };
    
    // // Helper function to log IP and device information
    // const logIpAndDeviceInfo = async (socket) => {
    //   let ip = socket.handshake.headers["x-forwarded-for"]?.split(",")[0] || socket.handshake.address;
    //   let existIp = await Ip.findOne({ ip }) || await new Ip({ ip }).save();
    
    //   const deviceDetect = MyDeviceDetector(socket.handshake);
    //   let device = await Device.findOne({ deviceInfo: deviceDetect }) || await new Device({ deviceInfo: deviceDetect }).save();
    
    //   return { ip: existIp, device };
    // };
    


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

    socket.on("imagePermission", async ({ roomId, senderid, recieverid }) => {
      const result = await Room.findByIdAndUpdate(roomId, {
        imagesPermission: {
          active: true,
          senderID: senderid,
          recieverId: recieverid,
        },
      });
      const result2 = await ImageApproval.findOneAndUpdate(
        { roomId: roomId }, // filter object
        { status: true }, // update object
        { new: true } // options to return the updated document
      );
      const infoImageApproval = await ImageApproval.findOne({ roomId });
      result &&
        result?.members.forEach(async (member) => {
          const memberSocketId = userSocketMap.get(member.toString());
          io.to(memberSocketId).emit(
            "imagePermissionApproved",
            roomId,
            senderid,
            recieverid,
            infoImageApproval
          );
        });

    });
    socket.on(
      "guestUserMessageApprovalPermission",
      async ({ roomId, senderid, recieverid }) => {

        const result = await Room.findByIdAndUpdate(roomId, {
          messagePermission: {
            active: true,
            senderID: senderid,
            recieverId: recieverid,
          },
        });
        const result2 = await MessageApproval.findOneAndUpdate(
          { roomId: roomId }, // filter object
          { status: true }, // update object
          { new: true } // options to return the updated document
        );
        let allRooms = await getRooms(socket);
        // socket.emit("rooms", allRooms);
        result &&
          result?.members.forEach(async (member) => {
            const memberSocketId = userSocketMap.get(member.toString());
            io.to(memberSocketId).emit(
              "guestUserMessageRequestApproved",
              roomId,
              senderid,
              recieverid,
            );
          });
      }
    );

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
      console.log(662, "joinRoom")
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

      const allRooms = await getRooms(socket);

      socket.emit("rooms", allRooms);
      // socket.emit("rooms", rooms);
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
