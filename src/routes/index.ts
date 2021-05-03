import express from "express";
var router = express.Router();

/* GET home page. */
router.get("/", function (req: any, res: any, next: any) {
  res.render("index", { title: "Juhes" });
});

export default router;
