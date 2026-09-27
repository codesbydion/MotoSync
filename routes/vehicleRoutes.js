const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const Vehicle = require("../models/Vehicle");
const ServiceRecord = require("../models/ServiceRecord");
const MaintenanceAlert = require("../models/MaintenanceAlert");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch vehicles" });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, user: req.user._id });
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch vehicle" });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { brand, model, registrationNo, year, fuelType, mileage } = req.body;

    if (!brand || !model || !registrationNo) {
      return res.status(400).json({ message: "brand, model and registrationNo are required" });
    }

    const vehicle = await Vehicle.create({
      user: req.user._id,
      brand,
      model,
      registrationNo,
      year,
      fuelType,
      mileage
    });

    res.status(201).json(vehicle);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Registration number already exists" });
    }
    res.status(500).json({ message: "Failed to create vehicle" });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { brand, model, registrationNo, year, fuelType, mileage } = req.body;

    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { brand, model, registrationNo, year, fuelType, mileage },
      { new: true }
    );

    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json(vehicle);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Registration number already exists" });
    }
    res.status(500).json({ message: "Failed to update vehicle" });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const userId = req.user._id;

    // Ensure the vehicle exists and belongs to the user
    const vehicle = await Vehicle.findOne({ _id: vehicleId, user: userId });
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // Delete associated service records and maintenance alerts
    await ServiceRecord.deleteMany({ vehicle: vehicleId });
    await MaintenanceAlert.deleteMany({ vehicle: vehicleId });

    // Finally, delete the vehicle itself
    await Vehicle.findByIdAndDelete(vehicleId);
    res.json({ message: "Vehicle and all associated records have been deleted." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete vehicle" });
  }
});

module.exports = router;
