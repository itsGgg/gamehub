require("dotenv").config();
const express = require("express");
const app = express();
const port = 8080;
const localhost = "https://localhost:";
const session = require("express-session");

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "session-secret",
    resave: false,
    saveUninitialized: false,
  }),
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user;
  next();
});

// --------------------------------------- //
const auth = require("./routes/auth");
const sudoku = require("./routes/sudoku");
const invitations = require("./routes/invitations");
const connect4 = require("./routes/connect4");
const tictactoe = require("./routes/tictactoe");

app.use("/", auth);
app.use("/jeux/sudoku", sudoku);
app.use("/jeux/connect4", connect4);
app.use("/jeux/tictactoe", tictactoe);
app.use("/invitations", invitations);

app.use((req, res) => {
  res.status(404).send(`
    <h1>Error 404</h1>
    <p>Page non trouvée</p>
    <a href="/">Retour à l'accueil</a>
  `);
});

app.listen(port, () => {
  console.log(localhost + port);
});
