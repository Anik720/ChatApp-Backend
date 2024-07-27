const express = require("express");
const Router = express.Router();

// Import the controllers

const userController = require("../controller/user.controller");

Router.route("/").get(userController.get).post(userController.create);

Router.route("/:id").put(userController.update).delete(userController.delete);

Router.route("/search/:nickName").get(userController.searchUserByNickName);
Router.route("/room-exits").get(userController.getUsersIfRoomExits);

module.exports = Router;
