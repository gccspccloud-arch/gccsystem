const Meeting = require('../models/Meeting');
const { success, error } = require('../utils/apiResponse');

const PERSON_FIELDS = 'firstName lastName email role memberStatus';

const POPULATE = [
  { path: 'meetingType', select: 'name' },
  { path: 'createdBy', select: 'firstName lastName' },
  { path: 'teacher.ref', select: PERSON_FIELDS },
  { path: 'ministers.ref', select: PERSON_FIELDS },
];

const list = async (req, res, next) => {
  try {
    const { from, to, type, scope } = req.query;
    const filter = {};
    if (type) filter.meetingType = type;
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

    const items = await Meeting.find(filter)
      .populate(POPULATE)
      .sort({ scheduledAt: scope === 'past' ? -1 : 1 });
    return success(res, items, 'Meetings fetched');
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await Meeting.findById(req.params.id).populate(POPULATE);
    if (!item) return error(res, 'Meeting not found', 404);
    return success(res, item, 'Meeting fetched');
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const payload = { ...req.body, createdBy: req.user._id };
    if (!payload.teacher || !payload.teacher.ref) {
      payload.teacher = { kind: 'User', ref: req.user._id }; // default teacher to creator
    }
    const item = await Meeting.create(payload);
    await item.populate(POPULATE);
    return success(res, item, 'Meeting scheduled', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await Meeting.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate(POPULATE);
    if (!item) return error(res, 'Meeting not found', 404);
    return success(res, item, 'Meeting updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const item = await Meeting.findByIdAndDelete(req.params.id);
    if (!item) return error(res, 'Meeting not found', 404);
    return success(res, { id: item._id }, 'Meeting deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove };
