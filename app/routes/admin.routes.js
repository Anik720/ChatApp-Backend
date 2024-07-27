const express = require("express");
const Router = express.Router();

// Import the controllers

const userController = require("../controller/admin/user.controller");
const ipController = require("../controller/admin/ip.controller");
const filterController = require("../controller/admin/filter.controller");
const conversationController = require("../controller/admin/conversation.controller");
const deviceController = require("../controller/admin/device.controller");
const dashboardController = require("../controller/admin/dashboard.controller");

Router.route("/users").get(userController.get);
Router.route("/users/all").get(userController.getAllUser);
Router.route("/user/banned-user").post(userController.banned);
Router.route("/user/unbanned-user").post(userController.unbanned);
Router.route("/user/room/:id").get(userController.getRoomsByUserId);
Router.route("/user/conversation/:id").get(
  userController.getConversationByRoomId
);

// ip route
Router.route("/ip").get(ipController.get).post(ipController.add);
Router.route("/ip/:id").delete(ipController.delete);

// filter word route
Router.route("/filter").post(filterController.add).get(filterController.get);

Router.route("/conversation/get-all-conversations").get(
  conversationController.getAllConversation
);
Router.route("/conversation/get-all-conversations-by-filter/:userId/:ipId/:roomId").get(conversationController.getAllConversationByFilter)

Router.route("/conversation/delete-conversation/:cid").delete(conversationController.deleteConversation)


// device route
Router.route("/device").get(deviceController.get);



// dashboard route
Router.route("/dashboard").get(dashboardController.dashboard);



module.exports = Router;
