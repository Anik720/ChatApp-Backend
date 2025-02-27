const express = require("express");
const Router = express.Router();

// Import the controllers
const roomController = require("../controller/room.controller");
const { authChecker } = require("../middleware/auth.middleware");

// import the middleware

Router.route("/").get(roomController.getRoom);
Router.route("/search/:id").get(roomController.getRoomByUserId);
Router.route("/public-rooms").get(roomController.publicRooms);
Router.route("/all-rooms").get(authChecker, roomController.getRooms);
Router.route("/group").post(authChecker, roomController.createGroupRoom);
Router.route("/joinGroup").post(roomController.joinGroup);
Router.route("/leaveGroup").post(roomController.leaveGroup);
Router.route("/deleteChat").post(roomController.deleteChat);
Router.route("/get-image-approval-list").get(roomController.getImageApprovalList);
Router.route("/get-quest-user-message-approval-list").get(roomController.getMessageApprovalList);

module.exports = Router;
