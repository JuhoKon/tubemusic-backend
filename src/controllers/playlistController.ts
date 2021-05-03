import SRedis from "../DAL/RedisInstance";
import Playlist from "../models/playlist.model";
import User from "../models/user.model";

const redis = require("redis"); // Cache

const RedisInstance = SRedis.getInstance();

export const index = function (req: any, res: any, next: any) {
  Playlist.find()
    .select("-playlist")
    .then((Playlist: any) => {
      // console.log(Playlist);
      res.json({ Playlist });
    }) // return playlists name + id
    .catch((err: any) => res.status(400).json("Error: " + err));
};
export const create = function (req: any, res: any, next: any) {
  // console.log(req.body.playlist);
  const playlist = new Playlist({
    name: req.body.name,
    playlist: req.body.playlist,
    private: req.body.isPrivate,
    owner: req.body.owner,
    genre: req.body.genre,
  });
  playlist
    .save()
    .then((data: any) => {
      res.json(data);
    })
    .catch((err: any) => res.status(400).json(err));
};
export const findByID = async function (req: any, res: any, next: any) {
  // console.log(req.params.id);
  if (!req.params.id) {
    return res.status(400).json({ error: "Id not submitted" });
  }
  const reply = await RedisInstance.getValue("Playlist" + req.params.id);
  if (reply) {
    console.log("Found from cache");
    const playlist = reply;
    res.json(playlist);
  } else {
    Playlist.findById(req.params.id).then((playlist: any) => {
      res.json(playlist);
      RedisInstance.setKey("Playlist" + req.params.id, playlist);
    });
  }
};
export const updatebyID = async function (req: any, res: any, next: any) {
  if (!req.body.name || !req.body.playlist) {
    return res.status(400).json({ error: "Please enter all fields" });
  }
  // console.log(req.body);

  Playlist.findById(req.params.id).then((playlist: any) => {
    (playlist.name = req.body.name),
      (playlist.playlist = req.body.playlist),
      (playlist.private = req.body.private),
      (playlist.owner = playlist.owner);
    playlist
      .save()
      .then(() => {
        res.json(playlist);
        RedisInstance.setKey("Playlist" + req.params.id, playlist);
      })
      .catch((err: any) => res.status(400).json({ error: err }));
  });
  // console.log(req.params.id);
};
export const addSongToPlayList = function (req: any, res: any, next: any) {
  if (!req.params.id || !req.body.track) {
    return res.status(400).json({ error: "Please enter all fields" });
  }

  Playlist.findById(req.params.id).then((playlist: any) => {
    playlist.playlist.push(req.body.track);
    playlist
      .save()
      .then(() => {
        res.json(playlist);
        RedisInstance.setKey("Playlist" + req.params.id, playlist);
      })
      .catch((err: any) => res.status(400).json({ error: err }));
  });
};
export const updatetime = function (req: any, res: any, next: any) {
  if (!req.body.videoId || !req.body.duration) {
    return res.status(400).json({ error: "Please enter all fields" });
  }
  Playlist.findById(req.params.id).then((playlist: any) => {
    for (let i = 0; i < playlist.playlist.length; i++) {
      if (playlist.playlist[i].videoId === req.body.videoId) {
        console.log(playlist.playlist[i].duration);
        playlist.playlist[i].duration = req.body.duration;
        break;
      }
    }
    playlist.markModified("playlist"); // very important.....
    playlist.save().then(res.json({ status: "OK" }));
  });
};
export const deletebyID = function (req: any, res: any, next: any) {
  if (req.user.role !== "Admin") {
    return res
      .status(401)
      .json({ msg: "Authorization denied. Insufficient role" });
  }
  Playlist.findByIdAndDelete(req.params.id) // delete actual post from the database
    .then(() => {
      RedisInstance.deleteKey("Playlist" + req.params.id);
      next();
    })
    .catch((err: any) => res.status(400).json({ error: err }));
};
export const deletebyIDHelper = function (req: any, res: any, next: any) {
  User.updateMany(
    {},
    { $pull: { playlists: { _id: req.params.id } } },
    function (err: any, data: any) {
      if (err) return res.status(400).json({ error: err });
      res.json("Playlist deleted.");
    }
  );
};
