const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const ServiceRecord = require("../models/ServiceRecord");
const Maintenance = require("../models/Maintenance");
const Vehicle = require("../models/Vehicle");
const ServiceType = require("../models/ServiceType");

/**
 * GET /api/analytics/overview
 * Get cost analytics overview (total cost, monthly breakdown, cost by service type)
 */
router.get("/overview", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all service records for the user
    const serviceRecords = await ServiceRecord.find({ user: userId })
      .populate("serviceType", "name")
      .lean();

    // Get all maintenance records for the user
    const maintenanceRecords = await Maintenance.find({ user: userId }).lean();

    // Combine and calculate totals
    const allRecords = [
      ...serviceRecords.map((r) => ({
        date: r.serviceDate,
        cost: r.totalCost,
        type: r.serviceType?.name || "Unknown Service",
        source: "service"
      })),
      ...maintenanceRecords.map((r) => ({
        date: r.date,
        cost: r.cost,
        type: r.category || "Maintenance",
        source: "maintenance"
      }))
    ];

    // Total cost
    const totalCost = allRecords.reduce((sum, r) => sum + (r.cost || 0), 0);

    // Monthly breakdown
    const monthlyData = {};
    allRecords.forEach((record) => {
      const date = new Date(record.date);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyData[yearMonth]) {
        monthlyData[yearMonth] = { month: yearMonth, cost: 0, count: 0 };
      }
      monthlyData[yearMonth].cost += record.cost || 0;
      monthlyData[yearMonth].count += 1;
    });

    const monthlyBreakdown = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    // Cost by service type
    const costByType = {};
    allRecords.forEach((record) => {
      if (!costByType[record.type]) {
        costByType[record.type] = { type: record.type, cost: 0, count: 0 };
      }
      costByType[record.type].cost += record.cost || 0;
      costByType[record.type].count += 1;
    });

    const typeBreakdown = Object.values(costByType).sort((a, b) => b.cost - a.cost);

    // Yearly breakdown
    const yearlyData = {};
    allRecords.forEach((record) => {
      const year = new Date(record.date).getFullYear();
      if (!yearlyData[year]) {
        yearlyData[year] = { year, cost: 0, count: 0 };
      }
      yearlyData[year].cost += record.cost || 0;
      yearlyData[year].count += 1;
    });

    const yearlyBreakdown = Object.values(yearlyData).sort((a, b) => a.year - b.year);

    // Average monthly cost
    const avgMonthlyCost = monthlyBreakdown.length > 0 
      ? (totalCost / monthlyBreakdown.length).toFixed(2)
      : 0;

    // Most expensive service type
    const mostExpensiveType = typeBreakdown.length > 0 ? typeBreakdown[0] : null;

    res.json({
      summary: {
        totalCost: totalCost.toFixed(2),
        recordCount: allRecords.length,
        avgMonthlyCost,
        mostExpensiveType: mostExpensiveType?.type || "N/A",
        mostExpensiveCost: mostExpensiveType?.cost?.toFixed(2) || 0
      },
      monthlyBreakdown: monthlyBreakdown.map((m) => ({
        ...m,
        cost: parseFloat(m.cost.toFixed(2))
      })),
      typeBreakdown: typeBreakdown.map((t) => ({
        ...t,
        cost: parseFloat(t.cost.toFixed(2))
      })),
      yearlyBreakdown: yearlyBreakdown.map((y) => ({
        ...y,
        cost: parseFloat(y.cost.toFixed(2))
      }))
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

/**
 * GET /api/analytics/vehicle-comparison
 * Compare costs across user's vehicles
 */
router.get("/vehicle-comparison", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all user's vehicles
    const vehicles = await Vehicle.find({ user: userId }).lean();

    const vehicleStats = await Promise.all(
      vehicles.map(async (vehicle) => {
        const serviceRecords = await ServiceRecord.find({ vehicle: vehicle._id }).lean();
        const maintenanceRecords = await Maintenance.find({ user: userId }).lean(); // Maintenance might not be tied to vehicle

        const totalCost = [
          ...serviceRecords.map((r) => r.totalCost || 0),
          ...maintenanceRecords.map((r) => r.cost || 0)
        ].reduce((sum, cost) => sum + cost, 0);

        return {
          vehicleId: vehicle._id,
          brand: vehicle.brand,
          model: vehicle.model,
          registrationNo: vehicle.registrationNo,
          year: vehicle.year,
          mileage: vehicle.mileage,
          recordCount: serviceRecords.length,
          totalCost: parseFloat(totalCost.toFixed(2)),
          avgCostPerService: serviceRecords.length > 0 
            ? parseFloat((totalCost / serviceRecords.length).toFixed(2))
            : 0
        };
      })
    );

    res.json({
      vehicles: vehicleStats.sort((a, b) => b.totalCost - a.totalCost)
    });
  } catch (error) {
    console.error("Vehicle comparison error:", error);
    res.status(500).json({ message: "Failed to fetch vehicle comparison" });
  }
});

/**
 * GET /api/analytics/recent-records
 * Get recent service/maintenance records
 */
router.get("/recent-records", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;

    const serviceRecords = await ServiceRecord.find({ user: userId })
      .populate("vehicle", "brand model registrationNo")
      .populate("serviceType", "name")
      .sort({ serviceDate: -1 })
      .limit(limit)
      .lean();

    const maintenanceRecords = await Maintenance.find({ user: userId })
      .sort({ date: -1 })
      .limit(limit)
      .lean();

    const combined = [
      ...serviceRecords.map((r) => ({
        _id: r._id,
        date: r.serviceDate,
        type: r.serviceType?.name || "Service",
        vehicle: `${r.vehicle?.brand} ${r.vehicle?.model}`,
        cost: r.totalCost,
        source: "service"
      })),
      ...maintenanceRecords.map((r) => ({
        _id: r._id,
        date: r.date,
        type: r.category || "Maintenance",
        vehicle: r.serviceType || "General",
        cost: r.cost,
        source: "maintenance"
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);

    res.json({ records: combined });
  } catch (error) {
    console.error("Recent records error:", error);
    res.status(500).json({ message: "Failed to fetch recent records" });
  }
});

module.exports = router;
