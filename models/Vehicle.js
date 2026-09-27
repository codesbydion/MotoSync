const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    registrationNo: { type: String, required: true, unique: true, uppercase: true, trim: true },
    year: Number,
    fuelType: String,
    mileage: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
