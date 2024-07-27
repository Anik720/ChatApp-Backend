module.exports.filterBadWord = async (req, res, next) => {
  const badWord = ["fuck", "sex"];

  const { message } = req.body;

  const filter = badWord.includes(message);

  if (filter) {
    return res.status(400).json({
      message: "we can't your text",
      success: false,
    });
  }
  next();
};
