const Conversation = require("../../model/conversation");
const User = require("../../model/user");

module.exports.dashboard = async (req, res) => {
    try {

        const users = await User.find({}).countDocuments();
        const bannedUsers = await User.find({ status: "banned" }).countDocuments();
        const activeUsers = await User.find({ status: "active" }).countDocuments();
        const guestUsers = await User.find({ type: "guest" }).countDocuments();

        // toay and last 7 days and last 30 days conversation count from conversation collection
        const todayConversationCount = await Conversation.find({
            created_at: {
                $gte: new Date(new Date().setHours(00, 00, 00)),
                $lt: new Date(new Date().setHours(23, 59, 59)),
            },
        }).countDocuments();

        const last7DaysConversationCount = await Conversation.find({
            created_at: {
                $gte: new Date(new Date().setDate(new Date().getDate() - 7)),
                $lt: new Date(new Date().setDate(new Date().getDate() - 1)),
            },
        }).countDocuments();

        const last30DaysConversationCount = await Conversation.find({
            created_at: {
                $gte: new Date(new Date().setDate(new Date().getDate() - 30)),
                $lt: new Date(new Date().setDate(new Date().getDate() - 1)),
            },
        }).countDocuments();

        const thisMonthConversationCount = await Conversation.find({
            created_at: {
                $gte: new Date(new Date().setDate(new Date().getDate() - 30)),
                $lt: new Date(new Date().setDate(new Date().getDate() - 1)),
            },
        }).countDocuments();


        const data = {
            users,
            bannedUsers,
            activeUsers,
            guestUsers,
            todayConversationCount,
            last7DaysConversationCount,
            last30DaysConversationCount,
            thisMonthConversationCount
        };






        return res.status(200).json({
            message: "User found",
            success: true,
            data,

        });
    } catch (error) {
        return res.status(400).json({
            message: error.message,
            success: false,
        });
    }
};