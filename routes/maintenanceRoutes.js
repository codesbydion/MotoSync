const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const maintenanceController = require("../controls/maintenancecontroller");

router.get("/", authMiddleware, maintenanceController.getAllMaintenance);
router.get("/:id", authMiddleware, maintenanceController.getMaintenanceById);
router.post("/", authMiddleware, maintenanceController.createMaintenance);
router.put("/:id", authMiddleware, maintenanceController.updateMaintenance);
router.delete("/:id", authMiddleware, maintenanceController.deleteMaintenance);

module.exports = router;
