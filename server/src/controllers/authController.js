const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const { success, error } = require('../utils/apiResponse');

const sanitize = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
});

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return error(res, 'Invalid email or password', 401);
    }
    if (!user.isActive) return error(res, 'Account is disabled', 403);

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken({ id: user._id, role: user.role });
    return success(res, { token, user: sanitize(user) }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const me = async (req, res) => {
  return success(res, sanitize(req.user), 'Current user');
};

module.exports = { login, me };
