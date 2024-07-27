const Device = require("../../model/device");

module.exports.get = async (req, res, next) => {
    try {
        const device = await Device.find();
        return res.status(200).json({
            message: "Get device successfully",
            success: true,
            device,
        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
            success: false,
        });
    }
};