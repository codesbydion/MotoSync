const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    tokenVersion: { type: Number, default: 0 },
    passwordChangedAt: Date,
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpiresAt: { type: Date, select: false },
    resetPasswordRequestedAt: { type: Date, select: false },
    phoneNo: String,
    address: String,
    gender: String,
    vehicles: { type: Array, default: [] },
    role: { type: String, enum: ["user", "admin", "super_admin"], default: "user" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
