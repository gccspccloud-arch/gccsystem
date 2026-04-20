const Member = require('../models/Member');
const { success, error } = require('../utils/apiResponse');

const createMember = async (req, res, next) => {
  try {
    const member = await Member.create(req.body);
    return success(res, member, 'Member registered successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getMembers = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const filter = search
      ? {
          $or: [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { middleName: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Member.find(filter).sort({ lastName: 1, firstName: 1 }).skip(skip).limit(Number(limit)),
      Member.countDocuments(filter),
    ]);

    return success(res, { items, total, page: Number(page), limit: Number(limit) }, 'Members fetched');
  } catch (err) {
    next(err);
  }
};

const getMemberById = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) return error(res, 'Member not found', 404);
    return success(res, member, 'Member fetched');
  } catch (err) {
    next(err);
  }
};

const updateMember = async (req, res, next) => {
  try {
    const member = await Member.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!member) return error(res, 'Member not found', 404);
    return success(res, member, 'Member updated');
  } catch (err) {
    next(err);
  }
};

const deleteMember = async (req, res, next) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) return error(res, 'Member not found', 404);
    return success(res, { id: member._id }, 'Member deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { createMember, getMembers, getMemberById, updateMember, deleteMember };
