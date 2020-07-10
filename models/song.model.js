var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var songSchema = new Schema(
  {
    title: { type: String, required: true },
    uniqueId: { type: String, required: true },
    videoId: { type: String, unique: true, required: true },
    duration: { type: String, required: true },
    term: { type: Array, required: true },
  },
  {
    timestamps: true,
  }
);
songSchema.index(
  { title: "text", term: "text" },
  {
    weights: {
      title: 1,
      term: 10,
    },
  }
);
module.exports = mongoose.model("Song", songSchema);
