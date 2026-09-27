const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminController = require("../controls/admincontroller");

router.get("/", authMiddleware, adminController.getServiceProviders);

module.exports = router;