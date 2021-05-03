import mongoose from "mongoose";

const Schema = mongoose.Schema;

const songSchema = new Schema(
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
      title: 50,
      term: 5,
      artists: 10,
      album: 10,
    },
  }
);
export default mongoose.model("Song", songSchema);
