const jwt = require("jsonwebtoken");
const User = require("../model/user");

module.exports.adminChecker = async (req, res, next) => {
  const cookie = req.cookies.authToken

  if (cookie && cookie.startsWith("Bearer ")) {
    const token = cookie && cookie.split(" ")[1];
    if (token == null)
      return res.status(401).json({
        message: "Token not found",
        success: false,
      });

    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
      if (err) return res.status(403).json({ message: "Invalid token" });
      const reqUser = await User.findById(user._id);

      if (reqUser.type !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      req.user = reqUser;
      next();
    });
  } else {
    return res.status(401).json({
      message: "Auth failed",
      success: false,
    });
  }
};
