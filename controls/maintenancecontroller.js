const Maintenance = require("../models/Maintenance");

const getAllMaintenance = async (req, res) => {
  try {
    const records = await Maintenance.find({ user: req.user._id }).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch maintenance records" });
  }
};

const getMaintenanceById = async (req, res) => {
  try {
    const record = await Maintenance.findOne({ _id: req.params.id, user: req.user._id });

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch record" });
  }
};

const createMaintenance = async (req, res) => {
  try {
    const { category, serviceType, cost, date } = req.body;

    if (!cost) {
      return res.status(400).json({ message: "Cost is required" });
    }

    const created = await Maintenance.create({
      user: req.user._id,
      category,
      serviceType,
      cost,
      date
    });

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: "Failed to create record" });
  }
};

const updateMaintenance = async (req, res) => {
  try {
    const { category, serviceType, cost, date } = req.body;

    const updated = await Maintenance.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { category, serviceType, cost, date },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update record" });
  }
};

const deleteMaintenance = async (req, res) => {
  try {
    const deleted = await Maintenance.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!deleted) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.json({ message: "Record deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete record" });
  }
};

module.exports = {
  getAllMaintenance,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance
};
