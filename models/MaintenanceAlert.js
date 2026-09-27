const mongoose = require("mongoose");

const maintenanceAlertSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true
    },
    serviceType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceType",
      required: true
    },
    dueDate: Date,
    dueMileage: Number,
    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("MaintenanceAlert", maintenanceAlertSchema);
