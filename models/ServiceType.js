const mongoose = require("mongoose");

const serviceTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    dueDays: Number,
    dueMileage: Number
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceType", serviceTypeSchema);
