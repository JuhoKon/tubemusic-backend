var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var songSchema = new Schema(
  {
    title: { type: String, required: true },
    uniqueId: { type: String, required: true },
    videoId: { type: String, unique: true, required: true },
    duration: { type: String, required: true },
    term: { type: Array, required: true },
    thumbnail: { type: String },
    thumbnails: { type: Array },
    album: {
      name: String,
      id: String,
    },
    artists: [
      {
        name: String,
        id: String,
      },
    ],
    resultType: { type: String },
  },
  {
    timestamps: true,
  }
);
songSchema.index(
  { title: "text", term: "text", "artists.name": "text", "album.name": "text" },
  {
    weights: {
      title: 1,
      term: 1,
      artists: 1,
      album: 5,
    },
  }
);
module.exports = mongoose.model("Song", songSchema);
