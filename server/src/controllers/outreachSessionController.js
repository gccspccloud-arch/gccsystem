const OutreachSession = require('../models/OutreachSession');
const Outreach = require('../models/Outreach');
const { success, error } = require('../utils/apiResponse');

const PERSON_FIELDS = 'firstName lastName email role memberStatus';

const POPULATE = [
  { path: 'outreach', select: 'name barangay city' },
  { path: 'createdBy', select: 'firstName lastName' },
  { path: 'teacher.ref', select: PERSON_FIELDS },
  { path: 'ministers.ref', select: PERSON_FIELDS },
];

const list = async (req, res, next) => {
  try {
    const { outreach, from, to, scope } = req.query;
    const filter = {};
    if (outreach) filter.outreach = outreach;
    if (from || to) {
      filter.scheduledAt = {};
      if (from) filter.scheduledAt.$gte = new Date(from);
      if (to) filter.scheduledAt.$lte = new Date(to);
    }
    if (scope === 'upcoming') {
      filter.scheduledAt = { ...(filter.scheduledAt || {}), $gte: new Date() };
    } else if (scope === 'past') {
      filter.scheduledAt = { ...(filter.scheduledAt || {}), $lt: new Date() };
    }

    const items = await OutreachSession.find(filter)
      .populate(POPULATE)
      .sort({ scheduledAt: scope === 'past' ? -1 : 1 });
    return success(res, items, 'Outreach sessions fetched');
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await OutreachSession.findById(req.params.id).populate(POPULATE);
    if (!item) return error(res, 'Session not found', 404);
    return success(res, item, 'Session fetched');
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const payload = { ...req.body, createdBy: req.user._id };

    // Inherit teacher/ministers from Outreach if not supplied.
    if (!payload.teacher || !payload.teacher.ref) {
      const parent = await Outreach.findById(payload.outreach);
      if (!parent) return error(res, 'Outreach not found', 404);
      payload.teacher = parent.teacher;
      if (!payload.ministers) payload.ministers = parent.ministers || [];
    }

    const item = await OutreachSession.create(payload);
    await item.populate(POPULATE);
    return success(res, item, 'Session scheduled', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await OutreachSession.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate(POPULATE);
    if (!item) return error(res, 'Session not found', 404);
    return success(res, item, 'Session updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const item = await OutreachSession.findByIdAndDelete(req.params.id);
    if (!item) return error(res, 'Session not found', 404);
    return success(res, { id: item._id }, 'Session deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove };
