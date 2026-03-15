export const requireRole = (user, allowed, res) => {
  if (!allowed.includes(user.role)) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
};