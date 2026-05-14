const Member = require('../models/Member');
const LdpCategory = require('../models/LdpCategory');
const { recomputeMemberLdp, recomputeAllMembersLdp } = require('../services/ldpRecompute');
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
    const member = await Member.findById(req.params.id)
      .populate({ path: 'ldp.category', select: 'name order options type autoMode' })
      .populate({ path: 'ldp.updatedBy', select: 'firstName lastName' });
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

/**
 * PATCH /members/:id/ldp
 * Body: { statuses: [{ category: <ObjectId>, value: <string> }] }
 * Replaces the member's LDP array with whatever was sent. Empty/missing
 * value means "not set" — the entry is dropped.
 * Validates each value against the category's allowed options.
 */
const updateMemberLdp = async (req, res, next) => {
  try {
    const { statuses } = req.body || {};
    if (!Array.isArray(statuses)) {
      return error(res, 'statuses must be an array', 400);
    }

    const member = await Member.findById(req.params.id);
    if (!member) return error(res, 'Member not found', 404);

    // Load all referenced categories in one query for validation.
    const categoryIds = [...new Set(statuses.map((s) => String(s.category)))];
    const categories = await LdpCategory.find({ _id: { $in: categoryIds } });
    const catMap = new Map(categories.map((c) => [String(c._id), c]));

    const now = new Date();
    const cleaned = [];
    for (const s of statuses) {
      const cat = catMap.get(String(s.category));
      if (!cat) return error(res, `Unknown category: ${s.category}`, 400);
      const value = (s.value || '').trim();
      if (!value) continue; // unset = drop the entry
      // Auto-managed categories can't be hand-edited — admin must switch
      // the category back to manual first. Keeps the next recompute from
      // silently overwriting a thoughtful manual override.
      if (cat.autoMode === 'attendance') {
        return error(
          res,
          `"${cat.name}" is auto-managed from attendance. Switch it to manual in Manage Categories before editing.`,
          400,
        );
      }
      if (cat.type === 'select') {
        const validLabels = cat.options.map((o) => o.label);
        if (!validLabels.includes(value)) {
          return error(res, `"${value}" is not a valid option for "${cat.name}"`, 400);
        }
      } else if (cat.type === 'text') {
        if (value.length > 1000) {
          return error(res, `"${cat.name}" must be 1000 characters or fewer`, 400);
        }
      }
      cleaned.push({
        category: cat._id,
        value,
        updatedAt: now,
        updatedBy: req.user._id,
      });
    }

    member.ldp = cleaned;
    await member.save();
    await member.populate({ path: 'ldp.category', select: 'name order options type autoMode' });
    await member.populate({ path: 'ldp.updatedBy', select: 'firstName lastName' });

    return success(res, member, 'LDP updated');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /members/:id/ldp/recompute
 * Run auto recompute for one member.
 */
const recomputeMemberLdpHandler = async (req, res, next) => {
  try {
    const result = await recomputeMemberLdp(req.params.id, { userId: req.user._id });
    const member = await Member.findById(req.params.id)
      .populate({ path: 'ldp.category', select: 'name order options type autoMode' })
      .populate({ path: 'ldp.updatedBy', select: 'firstName lastName' });
    return success(res, { member, report: result }, 'LDP recomputed');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /members/ldp/recompute-all  (admin only)
 * Run auto recompute for every member.
 */
const recomputeAllLdpHandler = async (req, res, next) => {
  try {
    const result = await recomputeAllMembersLdp({ userId: req.user._id });
    return success(res, result, 'LDP recomputed for all members');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createMember,
  getMembers,
  getMemberById,
  updateMember,
  deleteMember,
  updateMemberLdp,
  recomputeMemberLdpHandler,
  recomputeAllLdpHandler,
};
