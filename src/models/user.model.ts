import mongoose from "mongoose";
var Schema = mongoose.Schema;

var userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      required: true,
    },
    playlists: {
      type: Array,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
