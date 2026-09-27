const mongoose = require("mongoose");

const maintenanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  category: String,
  serviceType: String,
  cost: { type: Number, required: true },
  date: { type: Date, default: Date.now }

}, { timestamps: true });

module.exports = mongoose.model("Maintenance", maintenanceSchema);