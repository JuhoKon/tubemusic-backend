import express from "express";
const router = express.Router();
import * as playlist_controller from "../controllers/playlistController";

import auth from "../middleware/auth";
import rateLimit from "express-rate-limit";

// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// see https://expressjs.com/en/guide/behind-proxies.html
// app.set('trust proxy', 1);

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 20, // start blocking after 10 reqs
  message: "Too many requests on this ip.",
});


/* GET users listing. */
router.get("/", auth, playlist_controller.index); // ADMIN
router.delete(
  "/delete/:id",
  auth,
  playlist_controller.deletebyID,
  playlist_controller.deletebyIDHelper
); // ADMIN

router.post("/create",loginLimiter,auth, playlist_controller.create);

router.get("/find/:id", auth, playlist_controller.findByID);
router.put("/update/:id", auth, playlist_controller.updatebyID);
router.put("/additem/:id", auth, playlist_controller.addSongToPlayList);
router.put("/updatetime/:id", auth, playlist_controller.updatetime);
export default router;
