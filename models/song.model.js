var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var songSchema = new Schema(
  {
    title: { type: String, required: true },
    uniqueId: { type: String, required: true },
    videoId: { type: String, unique: true, required: true },
    duration: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);
songSchema.index({ title: "text" });
module.exports = mongoose.model("Song", songSchema);
