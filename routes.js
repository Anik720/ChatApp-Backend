const express = require("express");
const Router = express.Router();

//controllers
const UserRoutes = require("./app/routes/user.routes");
const AuthRoutes = require("./app/routes/auth.routes");
const RoomRoutes = require("./app/routes/room.routes");
const AdminRoutes = require("./app/routes/admin.routes");
const ConversationRoutes = require("./app/routes/Conversation.routes");
const { authChecker } = require("./app/middleware/auth.middleware");
const { filterBadWord } = require("./app/middleware/filterBadWord");
const { adminChecker } = require("./app/middleware/adminCheck.middleware");
const { ipChecker } = require("./app/middleware/ipChecker");

Router.get("/", async (req, res) => {
  res.send({
    msg: "Welcome to the API",
  });
});

Router.use("/auth", ipChecker, AuthRoutes);
Router.use("/user", ipChecker, authChecker, UserRoutes);
Router.use("/room", RoomRoutes);
Router.use(
  "/conversation",
  ipChecker,
  authChecker,
  filterBadWord,
  ConversationRoutes
);

Router.use("/admin", adminChecker, AdminRoutes);

module.exports = Router;
