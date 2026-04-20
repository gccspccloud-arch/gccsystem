const User = require('../models/User');
const Member = require('../models/Member');
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
  createdAt: user.createdAt,
  member: user.member && typeof user.member === 'object'
    ? {
        id: user.member._id,
        firstName: user.member.firstName,
        lastName: user.member.lastName,
        fullName: [user.member.firstName, user.member.lastName].filter(Boolean).join(' '),
        memberStatus: user.member.memberStatus,
      }
    : user.member || null,
});

// Admins can NOT create or promote to super_admin. Only super_admins can.
const canAssignRole = (actor, role) => {
  if (actor.role === 'super_admin') return true;
  if (actor.role === 'admin') return role === 'admin' || role === 'staff';
  return false;
};

const createUser = async (req, res, next) => {
  try {
    const { email, member, role = 'staff' } = req.body;

    if (!canAssignRole(req.user, role)) {
      return error(res, `You are not allowed to create a ${role} account`, 403);
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return error(res, 'A user with this email already exists', 409);

    if (member) {
      const memberDoc = await Member.findById(member);
      if (!memberDoc) return error(res, 'Member not found', 404);

      const linked = await User.findOne({ member });
      if (linked) return error(res, 'This member already has a user account', 409);
    }

    const user = await User.create({
      ...req.body,
      role,
      createdBy: req.user._id,
    });
    await user.populate({ path: 'member', select: 'firstName lastName memberStatus' });

    return success(res, sanitize(user), 'User created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .populate({ path: 'member', select: 'firstName lastName memberStatus' })
      .sort({ createdAt: -1 });
    return success(res, users.map(sanitize), 'Users fetched');
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { password, role, ...updates } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return error(res, 'User not found', 404);

    // Admins can't touch super_admin accounts and can't promote to super_admin
    if (req.user.role !== 'super_admin') {
      if (user.role === 'super_admin') {
        return error(res, 'Only a super admin can modify a super admin account', 403);
      }
      if (role && !canAssignRole(req.user, role)) {
        return error(res, `You are not allowed to assign the ${role} role`, 403);
      }
    }

    Object.assign(user, updates);
    if (role) user.role = role;
    if (password) user.password = password;

    await user.save();
    await user.populate({ path: 'member', select: 'firstName lastName memberStatus' });
    return success(res, sanitize(user), 'User updated');
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    if (String(req.user._id) === req.params.id) {
      return error(res, 'You cannot delete your own account', 400);
    }
    const target = await User.findById(req.params.id);
    if (!target) return error(res, 'User not found', 404);
    if (target.role === 'super_admin' && req.user.role !== 'super_admin') {
      return error(res, 'Only a super admin can delete a super admin account', 403);
    }
    await target.deleteOne();
    return success(res, { id: target._id }, 'User deleted');
  } catch (err) {
    next(err);
  }
};

const listAssignable = async (req, res, next) => {
  try {
    const users = await User.find({ isActive: true })
      .select('firstName lastName email role')
      .sort({ firstName: 1, lastName: 1 });
    return success(res, users, 'Assignable users fetched');
  } catch (err) {
    next(err);
  }
};

const getByMember = async (req, res, next) => {
  try {
    const user = await User.findOne({ member: req.params.memberId })
      .populate({ path: 'member', select: 'firstName lastName memberStatus' });
    if (!user) return success(res, null, 'No user account linked');
    return success(res, sanitize(user), 'Linked user fetched');
  } catch (err) {
    next(err);
  }
};

module.exports = { createUser, listUsers, updateUser, deleteUser, listAssignable, getByMember };
