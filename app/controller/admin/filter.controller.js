const { default: mongoose } = require("mongoose");
const Ip = require("../../model/ip");
const Filter = require("../../model/filter");

module.exports.get = async (req, res, next) => {
  try {
    const filter = await Filter.find();
    return res.status(200).json({
      message: "Get filter successfully",
      success: true,
      filter,
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
    const { words } = req.body;

    const exitsFIlter = await Filter.find();

    // delete exits filter
    exitsFIlter.forEach(async (filter) => {
      await Filter.findByIdAndDelete(filter._id);
    });

    words.forEach(async (word) => {
      new Filter({
        word,
      }).save();
    });

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
