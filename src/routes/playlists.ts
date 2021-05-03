import express from "express";
const router = express.Router();
import * as playlist_controller from "../controllers/playlistController";

import auth from "../middleware/auth";
/* GET users listing. */
router.get("/", auth, playlist_controller.index); // ADMIN
router.delete(
  "/delete/:id",
  auth,
  playlist_controller.deletebyID,
  playlist_controller.deletebyIDHelper
); // ADMIN

router.post("/create", auth, playlist_controller.create);

router.get("/find/:id", auth, playlist_controller.findByID);
router.put("/update/:id", auth, playlist_controller.updatebyID);
router.put("/additem/:id", auth, playlist_controller.addSongToPlayList);
router.put("/updatetime/:id", auth, playlist_controller.updatetime);
export default router;
