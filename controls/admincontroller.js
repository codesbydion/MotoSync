const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const ServiceRecord = require("../models/ServiceRecord");
const MaintenanceAlert = require("../models/MaintenanceAlert");
const ServiceType = require("../models/ServiceType");
const ServiceProvider = require("../models/ServiceProvider");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

// Configure email transporter. If EMAIL_USER/EMAIL_PASS are not set,
// skip sending emails (keeps the app working without SMTP configured).
const EMAIL_USER = (process.env.EMAIL_USER || "").trim();
const EMAIL_PASS = (process.env.EMAIL_PASS || "").trim();
const EMAIL_SERVICE = (process.env.EMAIL_SERVICE || "gmail").trim();

const transporter = (EMAIL_USER && EMAIL_PASS)
  ? nodemailer.createTransport({
      service: EMAIL_SERVICE,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    })
  : null;

if (!transporter) {
  console.warn("[EMAIL] EMAIL_USER/EMAIL_PASS not set; email notifications disabled.");
}

const getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-password").lean();
    const userIds = users.map((user) => user._id);
    const vehicles = await Vehicle.find({ user: { $in: userIds } }).lean();

    const vehiclesByUser = new Map();
    vehicles.forEach((vehicle) => {
      const key = String(vehicle.user);
      if (!vehiclesByUser.has(key)) vehiclesByUser.set(key, []);
      vehiclesByUser.get(key).push(vehicle);
    });

    const usersWithVehicles = users.map((user) => ({
      ...user,
      vehicles: vehiclesByUser.get(String(user._id)) || []
    }));

    res.json(usersWithVehicles);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users" });
  }
};

const getStatistics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalServices = await ServiceRecord.countDocuments();
    const totalRevenueData = await ServiceRecord.aggregate([
      { $group: { _id: null, total: { $sum: "$totalCost" } } }
    ]);
    const totalRevenue = totalRevenueData[0]?.total || 0;

    res.json({
      totalUsers,
      totalServices,
      totalRevenue
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching statistics" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { fullname, email, gender, role } = req.body;
    const update = {};

    if (fullname !== undefined) update.fullname = String(fullname).trim();
    if (email !== undefined) update.email = String(email).trim().toLowerCase();
    if (gender !== undefined) update.gender = gender;
    if (role !== undefined) {
      if (req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Only super admin can change roles" });
      }
      update.role = String(role).toLowerCase();
    }

    const updated = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    }).select("-password");

    if (!updated) return res.status(404).json({ message: "User not found" });

    res.json(updated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email or username already exists" });
    }
    res.status(500).json({ message: "Error updating user" });
  }
};

const createAdmin = async (req, res) => {
  try {
    let { fullname, username, email, password } = req.body;

    fullname = (fullname || "").trim();
    username = (username || "").trim();
    email = (email || "").trim().toLowerCase();
    password = (password || "").trim();

    if (!fullname || !username || !email || !password) {
      return res.status(400).json({ message: "fullname, username, email and password are required" });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      if (existing.email === email) return res.status(400).json({ message: "Email already exists" });
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      fullname,
      username,
      email,
      password: hashedPassword,
      role: "admin"
    });

    res.status(201).json({
      message: "Admin added successfully",
      admin: {
        _id: admin._id,
        fullname: admin.fullname,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email or username already exists" });
    }
    res.status(500).json({ message: "Error creating admin" });
  }
};

const getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: { $in: ["admin", "super_admin"] } })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: "Error fetching admins" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const targetId = req.params.id;

    if (String(req.user._id) === String(targetId)) {
      return res.status(400).json({ message: "Admin cannot delete their own account" });
    }

    const user = await User.findById(targetId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const vehicles = await Vehicle.find({ user: targetId }).select("_id");
    const vehicleIds = vehicles.map((v) => v._id);

    await ServiceRecord.deleteMany({
      $or: [{ user: targetId }, { vehicle: { $in: vehicleIds } }]
    });
    await MaintenanceAlert.deleteMany({ vehicle: { $in: vehicleIds } });
    await Vehicle.deleteMany({ user: targetId });
    await User.findByIdAndDelete(targetId);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user" });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const targetId = req.params.id;

    if (String(req.user._id) === String(targetId)) {
      return res.status(400).json({ message: "Super admin cannot delete their own account" });
    }

    const target = await User.findById(targetId).select("role");
    if (!target) return res.status(404).json({ message: "Admin not found" });

    if (target.role !== "admin") {
      return res.status(400).json({ message: "Only admin accounts can be deleted" });
    }

    await User.findByIdAndDelete(targetId);
    res.json({ message: "Admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting admin" });
  }
};

const getServiceTypes = async (req, res) => {
  try {
    const types = await ServiceType.find().sort({ name: 1 });
    res.json(types);
  } catch (error) {
    res.status(500).json({ message: "Error fetching service types" });
  }
};

const createServiceType = async (req, res) => {
  try {
    const { name, dueDays, dueMileage } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const created = await ServiceType.create({ name, dueDays, dueMileage });
    res.status(201).json(created);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Service type already exists" });
    }
    res.status(500).json({ message: "Error creating service type" });
  }
};

const updateServiceType = async (req, res) => {
  try {
    const { name, dueDays, dueMileage } = req.body;
    const updated = await ServiceType.findByIdAndUpdate(
      req.params.id,
      { name, dueDays, dueMileage },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Service type not found" });
    res.json(updated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Service type already exists" });
    }
    res.status(500).json({ message: "Error updating service type" });
  }
};

const deleteServiceType = async (req, res) => {
  try {
    const deleted = await ServiceType.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Service type not found" });
    res.json({ message: "Service type deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting service type" });
  }
};

const getServiceProviders = async (req, res) => {
  try {
    const providers = await ServiceProvider.find().sort({ providerName: 1 });
    res.json(providers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching service providers" });
  }
};

const createServiceProvider = async (req, res) => {
  try {
    const { providerName, address, contactNo, email, type } = req.body;
    if (!providerName) return res.status(400).json({ message: "providerName is required" });

    const created = await ServiceProvider.create({ providerName, address, contactNo, email, type: type || 'Third Party' });
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: "Error creating service provider" });
  }
};

const updateServiceProvider = async (req, res) => {
  try {
    const { providerName, address, contactNo, email, type } = req.body;
    const updated = await ServiceProvider.findByIdAndUpdate(
      req.params.id,
      { providerName, address, contactNo, email, type },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Service provider not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating service provider" });
  }
};

const deleteServiceProvider = async (req, res) => {
  try {
    const deleted = await ServiceProvider.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Service provider not found" });
    res.json({ message: "Service provider deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting service provider" });
  }
};

const getAlerts = async (req, res) => {
  try {
    const alerts = await MaintenanceAlert.find()
      .populate("vehicle", "user brand model registrationNo mileage")
      .populate("serviceType", "name")
      .sort({ status: 1, dueDate: 1, createdAt: -1 });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching alerts" });
  }
};

const resolveAlert = async (req, res) => {
  try {
    const updated = await MaintenanceAlert.findByIdAndUpdate(
      req.params.id,
      { status: "resolved" },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Alert not found" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error resolving alert" });
  }
};

const triggerMaintenanceChecks = async (req, res) => {
  try {
    const vehicles = await Vehicle.find().populate('user');
    const serviceTypes = await ServiceType.find();
    let alertsCreated = 0;
    let emailsSent = 0;

    for (const vehicle of vehicles) {
      for (const type of serviceTypes) {
        // Find the last service record for this type
        const lastRecord = await ServiceRecord.findOne({ 
          vehicle: vehicle._id, 
          serviceType: type._id 
        }).sort({ serviceDate: -1 });

        let isDue = false;
        let dueDate = null;

        // Use last service as a reference, or vehicle creation if no service exists
        const referenceDate = lastRecord?.serviceDate ?? vehicle.createdAt;
        const referenceMileage = lastRecord?.mileageAtService ?? 0;

        // We must have a reference date to check against
        if (!referenceDate) {
          continue;
        }

        // Check by Date
        if (type.dueDays) {
          const nextDate = new Date(referenceDate);
          nextDate.setDate(nextDate.getDate() + type.dueDays);
          if (new Date() > nextDate) {
            isDue = true;
            dueDate = nextDate;
          }
        }

        // Check by Mileage
        if (type.dueMileage && typeof vehicle.mileage === 'number') {
          const nextMileage = referenceMileage + type.dueMileage;
          if (vehicle.mileage >= nextMileage) {
            isDue = true;
          }
        }

        if (isDue) {
          // Check if an open alert already exists to avoid duplicates
          const existing = await MaintenanceAlert.findOne({
            vehicle: vehicle._id,
            serviceType: type._id,
            status: 'open'
          });

          if (!existing) {
            const dueMileageForAlert = type.dueMileage ? (referenceMileage + type.dueMileage) : undefined;

            await MaintenanceAlert.create({
              vehicle: vehicle._id,
              serviceType: type._id,
              status: 'open',
              dueDate: dueDate || new Date(), // If due by mileage, due date is now
              dueMileage: dueMileageForAlert
            });
            alertsCreated++;

            // Send Email Notification (best-effort, non-blocking)
            if (transporter && vehicle.user && vehicle.user.email) {
              const mailOptions = {
                from: EMAIL_USER || "noreply@motosync.com",
                to: vehicle.user.email,
                subject: `Maintenance Alert: ${type.name} Due - MotoSync`,
                text: `Hello ${vehicle.user.fullname},\n\nYour vehicle ${vehicle.brand} ${vehicle.model} (${vehicle.registrationNo}) is due for ${type.name}.\n\nPlease schedule a service soon to keep your vehicle in top condition.\n\nRegards,\nMotoSync Team`
              };
              // Attempt to send email (non-blocking)
              transporter.sendMail(mailOptions).catch(err => console.error("Email failed:", err));
              emailsSent++;
            }
          }
        }
      }
    }

    res.json({ 
      message: `Maintenance check complete.`, 
      details: `Created ${alertsCreated} new alerts and sent ${emailsSent} emails.` 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error running maintenance checks" });
  }
};

module.exports = {
  getUsers,
  getAdmins,
  createAdmin,
  getStatistics,
  updateUser,
  deleteUser,
  deleteAdmin,
  getServiceTypes,
  createServiceType,
  updateServiceType,
  deleteServiceType,
  getServiceProviders,
  createServiceProvider,
  updateServiceProvider,
  deleteServiceProvider,
  getAlerts,
  resolveAlert,
  triggerMaintenanceChecks
};
