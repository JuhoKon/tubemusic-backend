import mongoose from "mongoose";

var Schema = mongoose.Schema;

var playlistSchema = new Schema(
  {
    name: { type: String, required: true },
    owner: { type: String, required: true },
    playlist: { type: Array },
    private: { type: Boolean, required: true },
    genre: { type: String, required: false },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("playlist", playlistSchema);
