const superAdminMiddleware = (req, res, next) => {
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Super admin access only" });
  }
  next();
};

module.exports = superAdminMiddleware;
