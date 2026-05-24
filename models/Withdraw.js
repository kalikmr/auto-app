const mongoose = require("mongoose");

const WithdrawSchema = new mongoose.Schema({

  driver: String,        // phone number
  driverName: String,    // ✅ NEW: driver ka naam store hoga
  amount: Number,

  status: {
    type: String,
    default: "Pending" // Pending / Approved / Rejected
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Withdraw", WithdrawSchema);