import express from "express";
const router = express.Router();
import * as userController from "../controllers/userController";
import { userValidationRules, uservalidate } from "../middleware/uservalidator";
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

router.get("/", auth, userController.index); // ADMIN
// TODO: ADD DELETE USER
router.post(
  "/create",
  loginLimiter,
  userValidationRules(),
  uservalidate,
  userController.create
);

router.put("/addPlaylist", auth, userController.addPlaylist);
router.delete("/deletePlaylist:id", auth, userController.removePlaylist);
router.put("/editPlaylist:id", auth, userController.editPlaylist);
export default router;
