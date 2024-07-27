const express = require("express");
const Router = express.Router();

// Import the controllers
const authController = require("../controller/auth.controller");
const { authChecker } = require("../middleware/auth.middleware");

// import the middleware

Router.route("/login").post(authController.login);
Router.route("/logout").post(authController.logout);

Router.route("/register").post(authController.register);
Router.route("/guest-register").post(authController.guestRegister);

Router.route("/me").get(authChecker, authController.me);

Router.route("/check-nick-name/:nickName").get(authController.checknickName);

Router.route("/forgot-password").post(authController.forgotPassword);

Router.route("/reset-password/:token").post(authController.resetPassword);

Router.route("/verify-user/:userId").put(authController.verifyUser);

module.exports = Router;
