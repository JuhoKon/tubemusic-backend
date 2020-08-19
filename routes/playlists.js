var express = require("express");
var router = express.Router();
var playlist_controller = require("../controllers/playlistController");

var auth = require("../middleware/auth");
/* GET users listing. */
router.get("/", auth, playlist_controller.index); //ADMIN
router.delete(
  "/delete/:id",
  auth,
  playlist_controller.deletebyID,
  playlist_controller.deletebyIDHelper
); //ADMIN

router.post("/create", auth, playlist_controller.create);

router.get("/find/:id", auth, playlist_controller.findByID);
router.put("/update/:id", auth, playlist_controller.updatebyID);
router.put("/additem/:id", auth, playlist_controller.addSongToPlayList);
router.put("/updatetime/:id", auth, playlist_controller.updatetime);
module.exports = router;
