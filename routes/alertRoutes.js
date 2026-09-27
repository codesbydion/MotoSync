const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const Vehicle = require("../models/Vehicle");
const MaintenanceAlert = require("../models/MaintenanceAlert");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ user: req.user._id }).select("_id");
    const vehicleIds = vehicles.map((v) => v._id);

    const alerts = await MaintenanceAlert.find({ vehicle: { $in: vehicleIds } })
      .populate("vehicle", "brand model registrationNo mileage")
      .populate("serviceType", "name dueDays dueMileage")
      .sort({ dueDate: 1, createdAt: -1 });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch alerts" });
  }
});

router.get("/due", authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const vehicles = await Vehicle.find({ user: req.user._id }).select("_id mileage");
    const vehicleIds = vehicles.map((v) => v._id);

    const alerts = await MaintenanceAlert.find({
      vehicle: { $in: vehicleIds },
      status: "open",
      $or: [{ dueDate: { $lte: now } }, { dueMileage: { $ne: null } }]
    })
      .populate("vehicle", "brand model registrationNo mileage")
      .populate("serviceType", "name dueDays dueMileage");

    const due = alerts.filter((a) => {
      const byDate = a.dueDate ? new Date(a.dueDate) <= now : false;
      const byMileage =
        typeof a.dueMileage === "number" &&
        a.vehicle &&
        typeof a.vehicle.mileage === "number" &&
        a.vehicle.mileage >= a.dueMileage;
      return byDate || byMileage;
    });

    res.json(due);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch due alerts" });
  }
});

router.patch("/:id/resolve", authMiddleware, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ user: req.user._id }).select("_id");
    const vehicleIds = vehicles.map((v) => v._id);

    const updated = await MaintenanceAlert.findOneAndUpdate(
      { _id: req.params.id, vehicle: { $in: vehicleIds } },
      { status: "resolved" },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Alert not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to resolve alert" });
  }
});

module.exports = router;
