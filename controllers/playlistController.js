var Playlist = require("../models/playlist.model");
var User = require("../models/user.model");

const redis = require("redis"); //Cache
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const client = redis.createClient(REDIS_URL);
client.on("error", (err) => {
  console.log("Error " + err);
});
client.on("connect", function () {
  console.log("You are now connected");
});

exports.index = function (req, res, next) {
  Playlist.find()
    .select("-playlist")
    .then((Playlist) => {
      //console.log(Playlist);
      res.json({ Playlist: Playlist });
    }) //return playlists name + id
    .catch((err) => res.status(400).json("Error: " + err));
};
exports.create = function (req, res, next) {
  //console.log(req.body.playlist);
  var playlist = new Playlist({
    name: req.body.name,
    playlist: req.body.playlist,
    private: req.body.isPrivate,
    owner: req.body.owner,
    genre: req.body.genre,
  });
  playlist
    .save()
    .then((data) => {
      res.json(data);
    })
    .catch((err) => res.status(400).json(err));
};
exports.findByID = function (req, res, next) {
  //console.log(req.params.id);
  if (!req.params.id) {
    return res.status(400).json({ error: "Id not submitted" });
  }
  client.get("Playlist" + req.params.id, async function (err, reply) {
    if (reply) {
      console.log("Found from cache");
      const playlist = JSON.parse(reply);
      res.json(playlist);
    } else {
      Playlist.findById(req.params.id)
        .then((playlist) => {
          res.json(playlist);
          client.setex(
            "Playlist" + req.params.id,
            3600,
            JSON.stringify(playlist)
          );
        })
        .catch((err) => res.status(400).json("Error:" + err));
    }
  });
};
exports.updatebyID = async function (req, res, next) {
  if (!req.body.name || !req.body.playlist) {
    return res.status(400).json({ error: "Please enter all fields" });
  }
  //console.log(req.body);

  Playlist.findById(req.params.id).then((playlist) => {
    (playlist.name = req.body.name),
      (playlist.playlist = req.body.playlist),
      (playlist.private = req.body.private),
      (playlist.owner = playlist.owner);
    playlist
      .save()
      .then(() => {
        res.json(playlist);
        client.setex(
          "Playlist" + req.params.id,
          3600,
          JSON.stringify(playlist)
        );
      })
      .catch((err) => res.status(400).json({ error: err }));
  });
  // console.log(req.params.id);
};
exports.addSongToPlayList = function (req, res, next) {
  if (!req.params.id || !req.body.track) {
    return res.status(400).json({ error: "Please enter all fields" });
  }

  Playlist.findById(req.params.id).then((playlist) => {
    playlist.playlist.push(req.body.track);
    playlist
      .save()
      .then(() => {
        res.json(playlist);
        client.setex(
          "Playlist" + req.params.id,
          3600,
          JSON.stringify(playlist)
        );
      })
      .catch((err) => res.status(400).json({ error: err }));
  });
};
exports.updatetime = function (req, res, next) {
  if (!req.body.videoId || !req.body.duration) {
    return res.status(400).json({ error: "Please enter all fields" });
  }
  Playlist.findById(req.params.id).then((playlist) => {
    for (let i = 0; i < playlist.playlist.length; i++) {
      if (playlist.playlist[i].videoId === req.body.videoId) {
        console.log(playlist.playlist[i].duration);
        playlist.playlist[i].duration = req.body.duration;
        break;
      }
    }
    playlist.markModified("playlist"); //very important.....
    playlist.save().then(res.json({ status: "OK" }));
  });
};
exports.deletebyID = function (req, res, next) {
  if (req.user.role !== "Admin") {
    return res
      .status(401)
      .json({ msg: "Authorization denied. Insufficient role" });
  }
  Playlist.findByIdAndDelete(req.params.id) //delete actual post from the database
    .then(() => {
      client.del("Playlist" + req.params.id);
      next();
    })
    .catch((err) => res.status(400).json({ error: err }));
};
exports.deletebyIDHelper = function (req, res, next) {
  User.updateMany(
    {},
    { $pull: { playlists: { _id: req.params.id } } },
    function (err, data) {
      if (err) return res.status(400).json({ error: err });
      res.json("Playlist deleted.");
    }
  );
};
