const express = require("express");
const Router = express.Router();

// Import the controllers
const roomController = require("../controller/room.controller");

// import the middleware

Router.route("/").get(roomController.getRoom);
Router.route("/search/:id").get(roomController.getRoomByUserId);
Router.route("/public-rooms").get(roomController.publicRooms);
Router.route("/group").post(roomController.createGroupRoom);
Router.route("/joinGroup").post(roomController.joinGroup);
Router.route("/leaveGroup").post(roomController.leaveGroup);
Router.route("/deleteChat").post(roomController.deleteChat);

module.exports = Router;
