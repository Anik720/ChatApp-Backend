const Ip = require("../model/ip");

module.exports.ipChecker = async (req, res, next) => {
  let clientIp = req.headers["x-forwarded-for"] || req.connection.remoteAddress;


  //if clientIp is comma separated, take the first one
  if (clientIp.includes(",")) {
    clientIp = clientIp.split(",")[0];
  }
  //remove ::ffff: from ipv4
  if (clientIp.includes("::ffff:")) {
    clientIp = clientIp.replace("::ffff:", "");
  }
  //remove ::1 from ipv4
  if (clientIp.includes("::1")) {
    clientIp = clientIp.replace("::1", "");
  }
  //check if ip is banned
  const bannedIp = await Ip.findOne({ ip: clientIp });
  if (bannedIp) {
    return res.status(400).json({
      message: "Your ip is banned",
      success: false,
      nextPath: "/banned",
    });
  }

  next();
};
