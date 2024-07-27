const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const FilterSchema = new Schema(
  {
    word: {
      type: String,
      required: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const Filter = mongoose.model("Filter", FilterSchema);
module.exports = Filter;
