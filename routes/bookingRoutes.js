const express = require("express");
const crypto = require("crypto");

const Razorpay = require("razorpay");

const router = express.Router();

const Booking = require("../models/Booking");
const Driver = require("../models/Driver");


// RAZORPAY
console.log(process.env.RAZORPAY_KEY_ID);
const razorpay = new Razorpay({

  key_id: process.env.RAZORPAY_KEY_ID,

  key_secret: process.env.RAZORPAY_KEY_SECRET

});


// CREATE ORDER
router.post("/create-order", async (req, res) => {

  try {

    if (!req.session.user) {

      return res.status(401).json({
        error: "Login required"
      });

    }

    const { pickup, drop } = req.body;

    const dx = pickup.lat - drop.lat;
    const dy = pickup.lon - drop.lon;

    const distance =
      Math.sqrt(dx * dx + dy * dy) * 111;

    // const fare =
    //   Math.round(50 + (distance * 10));
    const fare = 1;

    const order =
      await razorpay.orders.create({

        amount: fare * 100,
        currency: "INR",
        receipt: "receipt_" + Date.now()

      });

    req.session.tempBooking = {
      pickup,
      drop,
      fare
    };

    req.session.save(() => {

      res.json(order);

    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "order error"
    });

  }

});


// VERIFY PAYMENT
router.post("/verify-payment", async (req, res) => {

  try {

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {

      return res.json({
        success: false
      });

    }

    const body =
      razorpay_order_id +
      "|" +
      razorpay_payment_id;

    const expected = crypto

      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )

      .update(body)

      .digest("hex");

    if (expected !== razorpay_signature) {

      return res.json({
        success: false
      });

    }

    const data = req.session.tempBooking;

    if (!data) {

      return res.json({
        success: false
      });

    }

    const otp =
      Math.floor(
        1000 + Math.random() * 9000
      ).toString();

    await new Booking({

      name: req.session.user,

      pickup: JSON.stringify(data.pickup),

      drop: JSON.stringify(data.drop),

      fare: data.fare,

      otp,

      status: "Pending",

      driver: ""

    }).save();

    req.session.tempBooking = null;

    req.session.save();

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


// MY RIDES
router.get("/myrides", async (req, res) => {

  if (!req.session.user) {
    return res.json([]);
  }

  const rides = await Booking.find({

    name: req.session.user

  }).sort({
    updatedAt: -1
  });

  res.json(rides);

});


// START RIDE
router.post("/start-ride/:id", async (req, res) => {

  const { otp } = req.body;

  const ride = await Booking.findById(
    req.params.id
  );

  if (!ride || ride.otp !== otp) {

    return res.json({
      success: false
    });

  }

  ride.status = "Ongoing";

  ride.updatedAt = new Date();

  await ride.save();

  res.json({
    success: true
  });

});


// COMPLETE RIDE
router.post("/complete/:id", async (req, res) => {

  const ride = await Booking.findById(
    req.params.id
  );

  if (!ride || !ride.driver) {

    return res.json({
      success: false
    });

  }

  const fare =
    Number(ride.fare) || 0;

  const driverShare =
    Math.round(fare * 0.8);

  const driver =
    await Driver.findOne({
      phone: ride.driver
    });

  if (driver) {

    driver.earnings += driverShare;

    await driver.save();

  }

  ride.status = "Completed";

  ride.updatedAt = new Date();

  await ride.save();

  res.json({
    success: true
  });

});


// CALCULATE FARE
router.post("/calculate-fare", (req, res) => {

  const { pickup, drop } = req.body;

  if (!pickup || !drop) {

    return res.json({
      success: false
    });

  }

  const dx = pickup.lat - drop.lat;
  const dy = pickup.lon - drop.lon;

  const distance =
    Math.sqrt(dx * dx + dy * dy) * 111;

  // const fare =
  //   Math.round(50 + (distance * 10));
  const fare = 1;

  res.json({
    success: true,
    fare
  });

});
//
router.get("/driver-location/:id", async (req, res) => {

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return res.json({ success: false });
  }

  const driver = await Driver.findOne({
    phone: booking.driver
  });

  if (!driver) {
    return res.json({ success: false });
  }

  res.json({

    success: true,

    lat: driver.currentLat,
    lon: driver.currentLon,

    driver: driver.name

  });

});

module.exports = router;