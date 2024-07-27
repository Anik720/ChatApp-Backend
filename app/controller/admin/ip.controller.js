const { default: mongoose } = require("mongoose");
const Ip = require("../../model/ip");

module.exports.get = async (req, res, next) => {
  try {
    const ips = await Ip.find();
    return res.status(200).json({
      message: "Ips fetched successfully",
      success: true,
      ips,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.add = async (req, res, next) => {
  try {
    const { ip } = req.body;
    // check ip format and if it is empty
    if (!ip || !ip.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
      return res.status(400).json({
        message: "Ip is not valid",
        success: false,
      });
    }

    // check if ip already exists
    const existIp = await Ip.findOne({ ip });
    if (existIp) {
      return res.status(400).json({
        message: "Ip already exists",
        success: false,
      });
    }

    const newIp = new Ip({
      ip,
    });
    await newIp.save();
    return res.status(200).json({
      message: "Ip added successfully",
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.delete = async (req, res, next) => {
  const { id } = req.params;
  try {
    const ip = await Ip.findById(id);
    if (!ip) {
      return res.status(400).json({
        message: "Ip not found",
        success: false,
      });
    }

    if (ip.status === "block") {
      await Ip.findByIdAndUpdate(id, { status: "active" });
    }
    if (ip.status === "active") {
      await Ip.findByIdAndUpdate(id, { status: "block" });
    }
    // await ip.save();

    return res.status(200).json({
      message: "Ip Updated successfully",
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};
