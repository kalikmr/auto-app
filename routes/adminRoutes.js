const express = require("express");
const path = require("path");
const Withdraw = require("../models/Withdraw");
const Driver = require("../models/Driver");
const router = express.Router();
const Booking = require("../models/Booking");


// ADMIN LOGIN PAGE
router.get("/admin-login.html", (req, res) => {

  res.sendFile(path.join(__dirname, "../public/admin-login.html"));

});

// ADMIN PANEL
router.get("/admin.html", (req, res) => {

  if (!req.session.admin) {
    return res.redirect("/admin-login.html");
  }

  res.sendFile(path.join(__dirname, "../public/admin.html"));

});


// EARNINGS PAGE
router.get("/earnings.html", (req, res) => {

  if (!req.session.admin) {
    return res.redirect("/admin-login.html");
  }

  res.sendFile(path.join(__dirname, "../public/earnings.html"));

});


// ADMIN LOGIN
router.post("/admin-login", (req, res) => {

  const { username, password } = req.body;

  if (
    username === "admin" &&
    password === "admin123"
  ) {

    req.session.admin = true;

    req.session.save(() => {

      res.json({
        success: true
      });

    });

  } else {

    res.json({
      success: false
    });

  }

});


// APPROVE DRIVER
router.post("/approve-driver/:id", async (req, res) => {

  if (!req.session.admin) {

    return res.json({
      success: false
    });

  }

  await Driver.findByIdAndUpdate(req.params.id, {
    approved: true
  });

  res.json({
    success: true
  });

});


// ADMIN EARNINGS
router.get("/admin-earnings", async (req, res) => {

  try {

    if (!req.session.admin) {

      return res.json({
        totalRevenue: 0,
        adminEarning: 0,
        totalRides: 0,
        drivers: []
      });

    }

    const rides = await Booking.find({
      status: "Completed"
    });

    let totalRevenue = 0;
    let adminEarning = 0;

    for (let r of rides) {

      const fare = Number(r.fare) || 0;

      totalRevenue += fare;

      adminEarning += Math.round(fare * 0.2);

    }

    const drivers = await Driver.find();

    const driverData = drivers.map(d => ({
      name: d.name,
      phone: d.phone,
      earnings: d.earnings || 0,
      lastPayout: d.lastPayout || 0
    }));

    res.json({
      totalRevenue,
      adminEarning,
      totalRides: rides.length,
      drivers: driverData
    });

  } catch (err) {

    console.log(err);

    res.json({
      totalRevenue: 0,
      adminEarning: 0,
      totalRides: 0,
      drivers: []
    });

  }

});


// PAY DRIVER
router.post("/pay-driver/:phone", async (req, res) => {

  try {

    if (!req.session.admin) {

      return res.json({
        success: false
      });

    }

    const driver = await Driver.findOne({
      phone: req.params.phone
    });

    if (!driver) {

      return res.json({
        success: false
      });

    }

    driver.lastPayout = driver.earnings;
    driver.earnings = 0;

    await driver.save();

    res.json({
      success: true
    });

  } catch (err) {

    console.log(err);

    res.json({
      success: false
    });

  }

});


// GET BOOKINGS
router.get("/bookings", async (req, res) => {

  try {

    if (!req.session.admin) {
      return res.json([]);
    }

    const bookings = await Booking.find()
      .sort({ updatedAt: -1 });

    res.json(bookings);

  } catch (err) {

    console.log(err);

    res.json([]);

  }

});


// GET DRIVERS
router.get("/drivers", async (req, res) => {

  try {

    if (!req.session.admin) {
      return res.json([]);
    }

    const drivers = await Driver.find();

    res.json(drivers);

  } catch (err) {

    console.log(err);

    res.json([]);

  }

});


// DELETE DRIVER
router.post("/delete-driver/:id", async (req, res) => {

  try {

    if (!req.session.admin) {

      return res.json({
        success: false
      });

    }

    await Driver.findByIdAndDelete(req.params.id);

    res.json({
      success: true
    });

  } catch (err) {

    console.log(err);

    res.json({
      success: false
    });

  }

});
//new wdh opt//
router.get("/withdraw-requests", async (req, res) => {
  const data = await Withdraw.find({ status: "Pending" })
    .sort({ createdAt: -1 });

  res.json(data);
});
//new wd 2nd wala//
router.post("/approve-withdraw/:id", async (req, res) => {

  const request = await Withdraw.findById(req.params.id);

  if (!request || request.status !== "Pending") {
    return res.json({ success: false });
  }

  const driver = await Driver.findOne({
    phone: request.driver
  });

  if (!driver) {
    return res.json({ success: false });
  }

  const amount = Number(request.amount);

  if ((driver.earnings || 0) < amount) {
    return res.json({ success: false });
  }

  // ✅ FIXED LOGIC
  driver.earnings = Number(driver.earnings || 0) - amount;

  driver.lastPayout = amount; // 🔥 only THIS transaction
  driver.totalPayout = (driver.totalPayout || 0) + amount;

  await driver.save();

  request.status = "Approved";
  await request.save();

  res.json({ success: true });

});
// new wdh //
router.post("/reject-withdraw/:id", async (req, res) => {

  if (!req.session.admin) {
    return res.json({ success: false });
  }

  await Withdraw.findByIdAndUpdate(req.params.id, {
    status: "Rejected"
  });

  res.json({ success: true });
});
module.exports = router;