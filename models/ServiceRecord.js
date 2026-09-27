const mongoose = require("mongoose");

const serviceRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true
    },
    serviceType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceType",
      required: true
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProvider"
    },
    serviceDate: { type: Date, default: Date.now },
    totalCost: { type: Number, required: true },
    remarks: String,
    mileageAtService: Number
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceRecord", serviceRecordSchema);
