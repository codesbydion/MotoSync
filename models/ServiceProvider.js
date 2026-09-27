const mongoose = require("mongoose");

const serviceProviderSchema = new mongoose.Schema(
  {
    providerName: { type: String, required: true, trim: true },
    address: String,
    contactNo: String,
    email: { type: String, trim: true, lowercase: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceProvider", serviceProviderSchema);
