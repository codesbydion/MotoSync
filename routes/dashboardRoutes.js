const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const MENU_BY_ROLE = {
  user: [
    { label: "Dashboard", path: "/user-dashboard.html#overview" },
    { label: "My Vehicles", path: "/user-dashboard.html#vehicles" },
    { label: "Maintenance", path: "/user-dashboard.html#maintenance" },
    { label: "Service Records", path: "/user-dashboard.html#service-records" },
    { label: "Alerts", path: "/user-dashboard.html#alerts" }
  ],
  admin: [
    { label: "Dashboard", path: "/reports.html#overview" },
    { label: "Users", path: "/reports.html#users" },
    { label: "Maintenance Queue", path: "/reports.html#maintenance-queue" },
    { label: "Service Types", path: "/reports.html#service-types" },
    { label: "Service Providers", path: "/reports.html#service-providers" },
    { label: "Alerts", path: "/reports.html#alerts" }
  ],
  super_admin: [
    { label: "Dashboard", path: "/reports.html#overview" },
    { label: "Admins", path: "/reports.html#admins" },
    { label: "Users", path: "/reports.html#users" },
    { label: "System Stats", path: "/reports.html#system-stats" },
    { label: "Service Types", path: "/reports.html#service-types" },
    { label: "Service Providers", path: "/reports.html#service-providers" },
    { label: "Alerts", path: "/reports.html#alerts" }
  ]
};

router.get("/menu", authMiddleware, (req, res) => {
  const role = req.user?.role || "user";
  const menu = MENU_BY_ROLE[role] || MENU_BY_ROLE.user;

  res.json({
    role,
    menu
  });
});

module.exports = router;
