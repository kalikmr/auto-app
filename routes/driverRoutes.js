
const express = require("express");
const path = require("path");
const multer = require("multer");
const router = express.Router();
const Driver = require("../models/Driver");
const Booking = require("../models/Booking");
const Withdraw = require("../models/Withdraw");


// FILE UPLOAD
const storage = multer.diskStorage({

  destination: "uploads/",

  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }

});

const upload = multer({
  storage
});


// DRIVER LOGIN PAGE
router.get("/driver-login.html", (req, res) => {

  res.sendFile(path.join(__dirname, "../public/driver-login.html"));

});


// DRIVER REGISTER PAGE
router.get("/driver-register.html", (req, res) => {

  res.sendFile(path.join(__dirname, "../public/driver-register.html"));

});


// DRIVER PANEL
router.get("/driver.html", (req, res) => {

  if (!req.session.driver) {
    return res.redirect("/driver-login.html");
  }

  res.sendFile(path.join(__dirname, "../public/driver.html"));

});

// DRIVER REGISTER
router.post(

  "/driver-register",

  upload.fields([
    { name: "aadharFile", maxCount: 1 },
    { name: "panFile", maxCount: 1 },
    { name: "rcFile", maxCount: 1 }
  ]),
  async (req, res) => {

    try {

      const {
        name,
        phone,
        password,
        aadhar,
        pan,
        vehicleNumber,
        license
      } = req.body;

      const aadharFile =
        req.files?.aadharFile?.[0]?.filename;

      const panFile =
        req.files?.panFile?.[0]?.filename;

      const rcFile =
        req.files?.rcFile?.[0]?.filename;

      // VALIDATION
      if (
        !name ||
        !phone ||
        !password ||
        !aadhar ||
        !pan ||
        !vehicleNumber ||
        !license ||
        !aadharFile ||
        !panFile ||
        !rcFile
      ) {

        return res.json({
          success: false,
          message: "Fill all fields"
        });

      }

      // DUPLICATE CHECK
      const exists = await Driver.findOne({
        phone
      });

      if (exists) {

        return res.json({
          success: false,
          message: "Driver already exists"
        });

      }

      // SAVE DRIVER
      await new Driver({

        name,
        phone,
        password,

        aadhar,
        pan,

        vehicleNumber,
        license,

        aadharFile,
        panFile,
        rcFile

      }).save();

      res.json({
        success: true
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        success: false,
        message: "Server error"
      });

    }

  }

);

// DRIVER LOGIN
router.post("/driver-login", async (req, res) => {
  try {

    const { phone, password } = req.body;

    const driver = await Driver.findOne({ phone });

    if (!driver) {
      return res.json({ success: false, message: "Driver not found" });
    }

    if (driver.password !== password) {
      return res.json({ success: false, message: "Wrong password" });
    }

    if (driver.approved !== true) {
      return res.json({ success: false, message: "Not approved yet" });
    }

    req.session.driver = driver.phone;

    req.session.save((err) => {
      if (err) {
        return res.json({ success: false, message: "Session error" });
      }

      res.json({ success: true });
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

// AVAILABLE RIDES
// AVAILABLE RIDES
router.get("/rides", async (req, res) => {

  try {

    if (!req.session.driver) {
      return res.json([]);
    }

    // DRIVER DATA
    const driver = await Driver.findOne({
      phone: req.session.driver
    });

    if (!driver) {
      return res.json([]);
    }

    // ALL PENDING RIDES
    const allRides = await Booking.find({
  status: "Pending",
  $or: [
    { driver: "" },
    { driver: null },
    { driver: { $exists: false } }
  ]
});

    // AGAR LOCATION AVAILABLE NAHI
    if (
      driver.currentLat == null ||
      driver.currentLon == null
    ) {

      return res.json(allRides);

    }

    // FILTER NEARBY RIDES
    const nearby = allRides.filter((ride) => {

      try {

        const pickup =
          typeof ride.pickup === "string"
            ? JSON.parse(ride.pickup)
            : ride.pickup;

        const distance = Math.sqrt(
          Math.pow(driver.currentLat - pickup.lat, 2) +
          Math.pow(driver.currentLon - pickup.lon, 2)
        );

     return true;

      } catch (e) {

        return false;

      }

    });

    res.json(nearby);

  } catch (err) {

    console.log(err);

    res.json([]);

  }

});
// ACCEPT RIDE
// ACCEPT RIDE
router.post("/driver-accept/:id", async (req, res) => {

  try {

    if (!req.session.driver) {

      return res.json({
        success: false
      });

    }

    // ACTIVE RIDE CHECK
    const activeRide = await Booking.findOne({

      driver: String(req.session.driver),

      status: {
        $in: ["Accepted", "Ongoing"]
      }

    });

    if (activeRide) {

      return res.json({
        success: false,
        message: "Complete current ride first"
      });

    }

    // DRIVER DATA
    const driverData = await Driver.findOne({
      phone: req.session.driver
    });

    // FIND RIDE
    const ride = await Booking.findById(req.params.id);

    if (!ride) {

      return res.json({
        success: false,
        message: "Ride not found"
      });

    }

    // UPDATE RIDE
    ride.status = "Accepted";

    ride.driver = String(req.session.driver);

    ride.driverName = driverData?.name || "";

    ride.updatedAt = new Date();

    await ride.save();

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
//
// ACCEPTED RIDES
// ACCEPTED RIDES
router.get("/accepted-rides", async (req, res) => {

  try {

    if (!req.session.driver) {
      return res.json([]);
    }

    console.log("SESSION DRIVER:", req.session.driver);

    const rides = await Booking.find({

      driver: {
        $regex: new RegExp("^" + req.session.driver + "$", "i")
      },

      status: {
        $in: ["Accepted", "Ongoing"]
      }

    }).sort({ updatedAt: -1 });

    console.log("FOUND RIDES:", rides.length);

    res.json(rides);

  } catch (err) {

    console.log(err);

    res.json([]);

  }

});
// DRIVER EARNINGS
router.get("/driver-earnings", async (req, res) => {

  if (!req.session.driver) {

    return res.json({
      earnings: 0
    });

  }

  const driver = await Driver.findOne({
    phone: req.session.driver
  });

  res.json({
    earnings: driver?.earnings || 0
  });

});
// new withdraw //
router.post("/withdraw-all", async (req, res) => {

  if (!req.session.driver) {
    return res.json({ success: false });
  }

  const driver = await Driver.findOne({
    phone: req.session.driver
  });

  if (!driver) {
    return res.json({ success: false });
  }

  // ✅ 🔴 THIS IS THE IMPORTANT PART
  const pending = await Withdraw.findOne({
    driver: req.session.driver,
    status: "Pending"
  });

  if (pending) {
    return res.json({
      success: false,
      message: "Already requested"
    });
  }

  if ((driver.earnings || 0) <= 0) {
    return res.json({
      success: false,
      message: "No earnings"
    });
  }

  await new Withdraw({
    driver: req.session.driver,
    amount: driver.earnings,
    status: "Pending",
    createdAt: new Date()
  }).save();

  res.json({
    success: true,
    message: "Request sent"
  });

});
//
router.post("/update-driver-location", async (req, res) => {

  if (!req.session.driver) {
    return res.json({ success: false });
  }

  const { lat, lon } = req.body;

  await Driver.updateOne(

    {
      phone: req.session.driver
    },

    {
      currentLat: lat,
      currentLon: lon
    }

  );

  res.json({
    success: true
  });

});
module.exports = router;