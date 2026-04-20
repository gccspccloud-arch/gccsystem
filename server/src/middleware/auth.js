const User = require('../models/User');
const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/apiResponse');

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) return error(res, 'Authentication required', 401);

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) return error(res, 'User no longer exists or is disabled', 401);

    req.user = user;
    next();
  } catch (err) {
    return error(res, 'Invalid or expired token', 401);
  }
};

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return error(res, 'Authentication required', 401);
  if (!allowedRoles.includes(req.user.role)) {
    return error(res, 'You do not have permission to perform this action', 403);
  }
  next();
};

module.exports = { protect, authorize };
