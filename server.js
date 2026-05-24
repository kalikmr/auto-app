require("dotenv").config();

const express = require("express");
const session = require("express-session");

const app = express();

require("./config/db");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "secret123",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: "lax"
  }
}));

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// ✅ IMPORTANT ROUTES PREFIXED
app.use(require("./routes/userRoutes"));
app.use(require("./routes/driverRoutes"));
app.use(require("./routes/adminRoutes"));
app.use(require("./routes/bookingRoutes"));

app.get("/check-auth", (req, res) => {
  res.json({
    user: req.session.user || null,
    admin: req.session.admin || false,
    driver: req.session.driver || false
  });
});
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src * 'self' 'unsafe-inline' 'unsafe-eval'");
  next();
});
app.listen(3000, () => {
  console.log("🚀 Server Running on http://localhost:3000");
});