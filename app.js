var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
// Additionally installed modules.
var hbs = require("express-handlebars");
var fileUpload = require("express-fileupload");
var session = require("express-session");
// Sessions are server-side files that store the user information.
// Cookies are client-side files that contain user information on a local computer.

//Database connection
var db = require("./config/mongodb");
db.connect((err) => {
  if (err) console.log(`Database Connection Failed ${err}`);
  else console.log("Database Connected");
});
var usersRouter = require("./routes/users");
var adminRouter = require("./routes/admin");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");
// partials & templates setup (https://hackersandslackers.com/handlebars-templates-expressjs/)
app.engine(
  "hbs",
  hbs.engine({
    //express-handlebars module is required here
    extname: "hbs",
    defaultLayout: "default",
    layoutsDir: __dirname + "/views/layouts/",
    partialsDir: __dirname + "/views/partials/",
  })
);

//middleware
app.use(logger("dev"));
//body-parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
//To serve static files such as images, CSS files, and JavaScript files, use the express.static built-in middleware function in Express.
app.use(express.static(path.join(__dirname, "public")));
app.use(fileUpload());
//set up express session middleware (app.use())
//https://www.section.io/engineering-education/session-management-in-nodejs-using-expressjs-and-express-session/
app.use(
  session({
    secret: "@secretkey#",
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 1 * 60 * 60 * 1000 },
  })
);

//Routes
app.use("/", usersRouter);
app.use("/admin", adminRouter);

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
