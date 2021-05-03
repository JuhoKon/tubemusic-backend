import express from "express";
const router = express.Router();
import * as userController from "../controllers/userController";
import { userValidationRules, uservalidate } from "../middleware/uservalidator";
import auth from "../middleware/auth";

router.get("/", auth, userController.index); // ADMIN
// TODO: ADD DELETE USER
router.post(
  "/create",
  userValidationRules(),
  uservalidate,
  userController.create
);

router.put("/addPlaylist", auth, userController.addPlaylist);
router.delete("/deletePlaylist:id", auth, userController.removePlaylist);
router.put("/editPlaylist:id", auth, userController.editPlaylist);
export default router;
