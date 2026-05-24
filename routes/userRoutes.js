const bcrypt = require("bcrypt");
const express = require("express");
const path = require("path");

const router = express.Router();

const User = require("../models/User");


// USER LOGIN PAGE
router.get("/user-login.html", (req, res) => {

  res.sendFile(path.join(__dirname, "../public/user-login.html"));

});


// BOOK PAGE
router.get("/book.html", (req, res) => {

  if (!req.session.user) {
    return res.redirect("/user-login.html");
  }

  res.sendFile(path.join(__dirname, "../public/book.html"));

});


// REGISTER
router.post("/register", async (req, res) => {
const existingUser =
  await User.findOne({
    name: req.body.name
  });

if (existingUser) {

  return res.json({
    success: false,
    message: "User already exists"
  });

}
 const hashedPassword =
  await bcrypt.hash(req.body.password, 10);

await new User({
  name: req.body.name,
  password: hashedPassword
}).save();
  res.json({
    success: true
  });

});


// LOGIN
router.post("/user-login", async (req, res) => {

  const { name, password } = req.body;

  const user = await User.findOne({
    name
  });

  if (!user) {

    return res.json({
      success: false
    });

  }

  const match =
    await bcrypt.compare(
      password,
      user.password
    );

  if (!match) {

    return res.json({
      success: false
    });

  }

  req.session.user = user.name;

  req.session.save(() => {

    res.json({
      success: true
    });

  });

});


// LOGOUT
router.get("/logout", (req, res) => {

  req.session.destroy(() => {

    res.json({
      success: true
    });

  });

});


module.exports = router;