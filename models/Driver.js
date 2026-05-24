const mongoose = require("mongoose");

const DriverSchema = new mongoose.Schema({
  latitude: Number,
  longitude: Number,

  currentLat: Number,
  currentLon: Number,

  name: String,
  phone: String,
  password: String,

  aadhar: String,
  pan: String,

  vehicleNumber: String,
  license: String,

  aadharFile: String,
  panFile: String,
  rcFile: String,

  approved: {
    type: Boolean,
    default: false
  },

  earnings: {
    type: Number,
    default: 0
  },

  lastPayout: {
    type: Number,
    default: 0
  }

});

module.exports = mongoose.model("Driver", DriverSchema);