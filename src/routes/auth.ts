import express from "express";
const router = express.Router();
import auth from "../middleware/auth";
import * as authController from "../controllers/authController";
import rateLimit from "express-rate-limit";

// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// see https://expressjs.com/en/guide/behind-proxies.html
// app.set('trust proxy', 1);

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 10, // start blocking after 10 reqs
  message: "Too many logins on this ip.",
});

router.post("/", loginLimiter, authController.auth);

router.get("/user", auth, authController.findUser); // returns ALL info about user made
router.get("/renew", auth, authController.renew);

export default router;
