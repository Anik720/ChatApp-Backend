const express = require("express");
const Router = express.Router();

// Import the controllers
const conversationController = require("../controller/conversation.controller");

Router.route("/")
  .get(conversationController.get)
  .post(conversationController.create);

module.exports = Router;
