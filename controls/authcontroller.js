const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");

const normalizeRole = (role) => {
  const value = String(role || "").toLowerCase().replace(/\s+/g, "_");
  return value === "superadmin" ? "super_admin" : value;
};

const FORGOT_RESPONSE_MESSAGE = "If the account exists, a password reset link has been sent.";
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const FORGOT_COOLDOWN_MS = 60 * 1000;
const IP_WINDOW_MS = 15 * 60 * 1000;
const MAX_FORGOT_PER_IP = 20;
const MAX_RESET_PER_IP = 20;

const forgotAttemptsByIp = new Map();
const resetAttemptsByIp = new Map();

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
};

const isRateLimited = (bucket, key, windowMs, maxAttempts) => {
  const now = Date.now();
  const recent = (bucket.get(key) || []).filter((ts) => now - ts < windowMs);

  if (recent.length >= maxAttempts) {
    bucket.set(key, recent);
    return true;
  }

  recent.push(now);
  bucket.set(key, recent);
  return false;
};

const isStrongPassword = (password) => {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
};

const getResetBaseUrl = () => {
  const raw = (process.env.RESET_PASSWORD_URL_BASE || process.env.FRONTEND_URL || "").trim();
  return raw.replace(/\/+$/, "");
};

const register = async (req, res) => {
  try {
    let {
      fullname,
      username,
      email,
      password,
      phone,
      phoneNo,
      address,
      gender,
      vehicle,
      vehicles
    } = req.body;

    fullname = (fullname || "").trim();
    username = (username || "").trim();
    email = (email || "").trim().toLowerCase();

    if (!fullname || !username || !email || !password) {
      return res.status(400).json({ message: "fullname, username, email and password are required" });
    }

    const existing = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existing) {
      if (existing.email === email) {
        return res.status(400).json({ message: "Email already exists" });
      }
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullname,
      username,
      email,
      password: hashedPassword,
      phoneNo: phone || phoneNo || "",
      address: address || "",
      gender: gender || ""
    });

    const vehiclesToCreate = [];

    if (vehicle && typeof vehicle === "object") {
      vehiclesToCreate.push(vehicle);
    }

    if (Array.isArray(vehicles)) {
      vehiclesToCreate.push(...vehicles);
    }

    const seenRegistrationNos = new Set();
    for (const v of vehiclesToCreate) {
      const brand = (v?.brand || "").trim();
      const model = (v?.model || "").trim();
      const registrationNo = String(v?.number || v?.registrationNo || "").trim();
      if (!brand || !model || !registrationNo) continue;
      if (seenRegistrationNos.has(registrationNo)) continue;
      seenRegistrationNos.add(registrationNo);

      await Vehicle.create({
        user: user._id,
        brand,
        model,
        registrationNo,
        fuelType: (v?.fuel || v?.fuelType || "").trim(),
        year: v?.year || undefined,
        mileage: typeof v?.mileage === "number" ? v.mileage : 0
      });
    }

    res.json({ message: "Registered successfully" });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email/username/vehicle registration already exists" });
    }
    res.status(500).json({ message: "Registration failed" });
  }
};

const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    email = (email || "").trim().toLowerCase();
    password = (password || "").trim();

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, tv: user.tokenVersion || 0 },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: user.role,
      user: {
        _id: user._id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch {
    res.status(500).json({ message: "Login failed" });
  }
};

const adminLogin = async (req, res) => {
  try {
    let { email, password } = req.body;

    email = (email || "").trim().toLowerCase();
    password = (password || "").trim();

    if (!email || !password) {
      return res.status(400).json({ message: "Admin email and password are required" });
    }

    const user = await User.findOne({
      role: { $in: ["admin", "super_admin"] },
      email
    });

    if (!user) {
      return res.status(400).json({ message: "Admin not found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, tv: user.tokenVersion || 0 },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: normalizeRole(user.role),
      admin: {
        _id: user._id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch {
    res.status(500).json({ message: "Admin login failed" });
  }
};

const registerAdmin = async (req, res) => {
  try {
    let { fullname, username, email, password, role } = req.body;

    fullname = (fullname || "").trim();
    username = (username || "").trim();
    email = (email || "").trim().toLowerCase();
    password = (password || "").trim();
    role = normalizeRole(role || "admin");

    if (!fullname || !username || !email || !password) {
      return res.status(400).json({ message: "fullname, username, email and password are required" });
    }

    if (!["admin", "super_admin"].includes(role)) {
      return res.status(400).json({ message: "Role must be admin or super_admin" });
    }

    if (role === "super_admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Only super admin can create super admin" });
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
      role
    });

    res.status(201).json({
      message: role === "super_admin" ? "Super admin created successfully" : "Admin created successfully",
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
    res.status(500).json({ message: "Admin creation failed" });
  }
};

const getMe = async (req, res) => {
  res.json({
    user: {
      _id: req.user._id,
      fullname: req.user.fullname,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role
    }
  });
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message: "New password must be at least 8 chars and include upper, lower, number and symbol"
      });
    }

    // authMiddleware intentionally excludes the password field, so fetch it here.
    const userWithPassword = await User.findById(req.user._id).select("password tokenVersion");
    if (!userWithPassword) {
      return res.status(401).json({ message: "User not found" });
    }

    // Verify current password
    const match = await bcrypt.compare(currentPassword, userWithPassword.password);
    if (!match) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and increment token version to invalidate old tokens
    userWithPassword.password = hashedPassword;
    userWithPassword.tokenVersion = (userWithPassword.tokenVersion || 0) + 1;
    userWithPassword.passwordChangedAt = new Date();
    await userWithPassword.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to change password" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    let { email, username, identifier } = req.body;
    email = (email || "").trim().toLowerCase();
    username = (username || "").trim();
    identifier = (identifier || "").trim();

    const lookup = email || username || identifier;
    if (!lookup) {
      return res.status(400).json({ message: "email, username or identifier is required" });
    }

    const clientIp = getClientIp(req);
    if (isRateLimited(forgotAttemptsByIp, clientIp, IP_WINDOW_MS, MAX_FORGOT_PER_IP)) {
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }

    const user = await User.findOne({
      $or: [{ email: lookup.toLowerCase() }, { username: lookup }]
    }).select("+resetPasswordRequestedAt");

    if (!user) {
      return res.json({ message: FORGOT_RESPONSE_MESSAGE });
    }

    const now = Date.now();
    if (user.resetPasswordRequestedAt && now - new Date(user.resetPasswordRequestedAt).getTime() < FORGOT_COOLDOWN_MS) {
      return res.json({ message: FORGOT_RESPONSE_MESSAGE });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(now + RESET_TOKEN_TTL_MS);

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpiresAt = expiresAt;
    user.resetPasswordRequestedAt = new Date(now);
    await user.save();

    const resetBaseUrl = getResetBaseUrl();
    const resetLink = resetBaseUrl ? `${resetBaseUrl}?token=${rawToken}` : "";

    if (process.env.NODE_ENV === "production") {
      console.log(`[SECURITY] Password reset requested for user ${user._id}.`);
    } else {
      console.log(
        `[SECURITY] Password reset requested for user ${user._id}.` +
        (resetLink ? ` Reset link: ${resetLink}` : " Set RESET_PASSWORD_URL_BASE to generate reset links.")
      );
    }

    const response = { message: FORGOT_RESPONSE_MESSAGE };
    if (process.env.NODE_ENV !== "production") {
      response.devResetToken = rawToken;
      response.expiresAt = expiresAt.toISOString();
    }

    return res.json(response);
  } catch {
    return res.status(500).json({ message: "Forgot password failed" });
  }
};

const resetPassword = async (req, res) => {
  try {
    let { token, newPassword } = req.body;
    token = (token || "").trim();
    newPassword = (newPassword || "").trim();

    if (!token || !newPassword) {
      return res.status(400).json({ message: "token and newPassword are required" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 8 chars and include upper, lower, number and symbol"
      });
    }

    const clientIp = getClientIp(req);
    if (isRateLimited(resetAttemptsByIp, clientIp, IP_WINDOW_MS, MAX_RESET_PER_IP)) {
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }

    const tokenHash = sha256(token);
    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() }
    }).select("+resetPasswordTokenHash +resetPasswordExpiresAt");

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const sameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (sameAsCurrent) {
      return res.status(400).json({ message: "New password must be different from current password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;
    user.resetPasswordRequestedAt = undefined;
    user.passwordChangedAt = new Date();
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch {
    res.status(500).json({ message: "Reset failed" });
  }
};

module.exports = {
  register,
  login,
  adminLogin,
  forgotPassword,
  resetPassword,
  registerAdmin,
  getMe,
  changePassword
};
