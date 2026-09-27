const express = require("express");
const authController = require("../controls/authcontroller");
const authMiddleware = require("../middleware/authMiddleware");
const superAdminMiddleware = require("../middleware/superAdminMiddleware");

const router = express.Router();

router.get("/test-connection", (req, res) => {
  res.json({ ok: true });
});

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/admin-login", authController.adminLogin);
router.post("/register-admin", authMiddleware, superAdminMiddleware, authController.registerAdmin);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/change-password", authMiddleware, authController.changePassword);
router.get("/me", authMiddleware, authController.getMe);

module.exports = router;
