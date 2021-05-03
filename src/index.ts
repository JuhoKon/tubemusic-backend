import createError from "http-errors";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import Promise from "bluebird";
import dotenv from "dotenv";
dotenv.config();

const app = express();

const whitelist = ["https://localhost:3000"];

const corsOptions = {
  origin(origin: any, callback: any) {
    console.log(origin);
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

// Then pass them to cors:
app.use(cors());

import indexRouter from "./routes/index";

import playlistsRouter from "./routes/playlists";
import scrapeRouter from "./routes/scrape";
import usersRouter from "./routes/users";
import authRouter from "./routes/auth";

app.use(logger("dev"));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

const mongoURL = process.env.MONGO_URL;

mongoose.connect(mongoURL, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
});
mongoose.Promise = Promise;
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.on(
  "open",
  console.log.bind(console, "MongoDB connection successful: " + mongoURL)
);
mongoose.set("useFindAndModify", false);

app.set("trust proxy", 1);
// view engine setup
app.use("/", indexRouter);
app.use("/playlists", playlistsRouter);
app.use("/scrape", scrapeRouter);
app.use("/users", usersRouter);
app.use("/auth", authRouter);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err: any, req: any, res: any, next: any) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({ error: "Erroria pukkaa." });
});

const port = process.env.PORT || "8080";

app.listen(port, () => {
  console.log(`BE listening at http://localhost:${port}`);
});

export default app;
