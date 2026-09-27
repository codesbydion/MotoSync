require("dotenv").config();
const dns = require("dns");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");

const connectDB = require("./config/db");
const User = require("./models/User");
const { startAlertScheduler } = require("./services/alertScheduler");
const PORT = process.env.PORT || 5000;

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (error) {
  console.warn("Custom DNS resolver setup failed, using system defaults.");
}

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", require("./routes/authRoutes")); 
app.use("/api/maintenance", require("./routes/maintenanceRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/vehicles", require("./routes/vehicleRoutes"));
app.use("/api/service-types", require("./routes/serviceTypeRoutes"));
app.use("/api/service-providers", require("./routes/serviceProviderRoutes"));
app.use("/api/service-records", require("./routes/serviceRecordRoutes"));
app.use("/api/alerts", require("./routes/alertRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function ensurePermanentAdmin() {
  const adminEmail = (process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = (process.env.SUPER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "").trim();
  const adminUsername = (process.env.SUPER_ADMIN_USERNAME || process.env.ADMIN_USERNAME || "superadmin").trim();
  const adminFullname = (process.env.SUPER_ADMIN_FULLNAME || process.env.ADMIN_FULLNAME || "System Super Admin").trim();

  if (!adminEmail || !adminPassword) {
    console.log("Permanent admin seed skipped (ADMIN_EMAIL / ADMIN_PASSWORD not set)");
    return;
  }

  const existing = await User.findOne({ email: adminEmail });

  if (existing) {
    if (existing.role !== "super_admin") {
      existing.role = "super_admin";
      if (!existing.username) existing.username = adminUsername;
      if (!existing.fullname) existing.fullname = adminFullname;
      await existing.save();
      console.log(`Promoted existing user to super admin: ${adminEmail}`);
    } else {
      console.log(`Permanent super admin already exists: ${adminEmail}`);
    }
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await User.create({
    fullname: adminFullname,
    username: adminUsername,
    email: adminEmail,
    password: hashedPassword,
    role: "super_admin"
  });

  console.log(`Permanent super admin created: ${adminEmail}`);
}

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not set in environment variables.");
    }

    await connectDB();
    await ensurePermanentAdmin();

    // Start the alert scheduler (runs every 60 minutes)
    startAlertScheduler(60);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Visit http://localhost:${PORT} to view the app`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
