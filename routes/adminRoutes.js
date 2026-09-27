const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const superAdminMiddleware = require("../middleware/superAdminMiddleware");
const adminController = require("../controls/admincontroller");

router.get("/users", authMiddleware, adminMiddleware, adminController.getUsers);
router.get("/admins", authMiddleware, superAdminMiddleware, adminController.getAdmins);
router.post("/admins", authMiddleware, superAdminMiddleware, adminController.createAdmin);
router.delete("/admins/:id", authMiddleware, superAdminMiddleware, adminController.deleteAdmin);
router.get("/statistics", authMiddleware, adminMiddleware, adminController.getStatistics);
router.put("/users/:id", authMiddleware, adminMiddleware, adminController.updateUser);
router.delete("/users/:id", authMiddleware, adminMiddleware, adminController.deleteUser);
router.get("/service-types", authMiddleware, adminMiddleware, adminController.getServiceTypes);
router.post("/service-types", authMiddleware, adminMiddleware, adminController.createServiceType);
router.put("/service-types/:id", authMiddleware, adminMiddleware, adminController.updateServiceType);
router.delete("/service-types/:id", authMiddleware, adminMiddleware, adminController.deleteServiceType);
router.get("/service-providers", authMiddleware, adminMiddleware, adminController.getServiceProviders);
router.post("/service-providers", authMiddleware, adminMiddleware, adminController.createServiceProvider);
router.put("/service-providers/:id", authMiddleware, adminMiddleware, adminController.updateServiceProvider);
router.delete("/service-providers/:id", authMiddleware, adminMiddleware, adminController.deleteServiceProvider);
router.get("/alerts", authMiddleware, adminMiddleware, adminController.getAlerts);
router.patch("/alerts/:id/resolve", authMiddleware, adminMiddleware, adminController.resolveAlert);
router.post("/maintenance/check", authMiddleware, adminMiddleware, adminController.triggerMaintenanceChecks);

module.exports = router;
