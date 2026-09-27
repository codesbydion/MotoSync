const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const ServiceType = require("../models/ServiceType");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const types = await ServiceType.find().sort({ name: 1 });
    res.json(types);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch service types" });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const type = await ServiceType.findById(req.params.id);
    if (!type) return res.status(404).json({ message: "Service type not found" });
    res.json(type);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch service type" });
  }
});

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, dueDays, dueMileage } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const created = await ServiceType.create({ name, dueDays, dueMileage });
    res.status(201).json(created);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Service type already exists" });
    }
    res.status(500).json({ message: "Failed to create service type" });
  }
});

router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, dueDays, dueMileage } = req.body;
    const updated = await ServiceType.findByIdAndUpdate(
      req.params.id,
      { name, dueDays, dueMileage },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Service type not found" });
    res.json(updated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Service type already exists" });
    }
    res.status(500).json({ message: "Failed to update service type" });
  }
});

router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const deleted = await ServiceType.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Service type not found" });
    res.json({ message: "Service type deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete service type" });
  }
});

module.exports = router;
