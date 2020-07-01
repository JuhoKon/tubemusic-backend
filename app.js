var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var cors = require("cors");
var bodyParser = require("body-parser");
var Promise = require("bluebird");
require("dotenv").config();
var app = express();

var whitelist = ["https://localhost:3000"];

var corsOptions = {
  origin: function (origin, callback) {
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

var indexRouter = require("./routes/index");
var playlistsRouter = require("./routes/playlists");
var scrapeRouter = require("./routes/scrape");
var usersRouter = require("./routes/users");
var authRouter = require("./routes/auth");

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(logger("dev"));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

var mongoURL =
  "mongodb+srv://newuser1234:GZpGTYpBP4Cggxdc@cluster0-n7w4j.mongodb.net/test?retryWrites=true&w=majority";
//var mongoURL =
//  "mongodb+srv://newuser123:jtLiGwVrgP2C9rNl@cluster0-n7w4j.mongodb.net/test?retryWrites=true&w=majority";
// Connecting to mongoose
//console.log(mongoURL);
mongoose.connect(mongoURL, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
});
mongoose.Promise = Promise;
var db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.on(
  "open",
  console.log.bind(console, "MongoDB connection successful: " + mongoURL)
);
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
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;