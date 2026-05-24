const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  name: String,
  pickup: String,
  drop: String,
  fare: Number,
  otp: String,
  status: String,
  driver: String,
  driverName: String,
  driverLat: Number,
  driverLon: Number,
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Booking", BookingSchema);