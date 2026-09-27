const adminMiddleware = (req, res, next) => {
  if (!["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

module.exports = adminMiddleware;
