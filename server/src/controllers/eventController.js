const Event = require('../models/Event');
const { success, error } = require('../utils/apiResponse');

const PERSON_FIELDS = 'firstName lastName email role memberStatus';

const POPULATE = [
  { path: 'eventType', select: 'name' },
  { path: 'createdBy', select: 'firstName lastName' },
  { path: 'teacher.ref', select: PERSON_FIELDS },
  { path: 'ministers.ref', select: PERSON_FIELDS },
];

const list = async (req, res, next) => {
  try {
    const { from, to, type } = req.query;
    const filter = {};
    if (type) filter.eventType = type;
    if (from || to) {
      filter.scheduledAt = {};
      if (from) filter.scheduledAt.$gte = new Date(from);
      if (to) filter.scheduledAt.$lte = new Date(to);
    }
    const items = await Event.find(filter).populate(POPULATE).sort({ scheduledAt: 1 });
    return success(res, items, 'Events fetched');
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await Event.findById(req.params.id).populate(POPULATE);
    if (!item) return error(res, 'Event not found', 404);
    return success(res, item, 'Event fetched');
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const payload = { ...req.body, createdBy: req.user._id };
    if (!payload.teacher || !payload.teacher.ref) {
      payload.teacher = { kind: 'User', ref: req.user._id };
    }
    const event = await Event.create(payload);
    await event.populate(POPULATE);
    return success(res, event, 'Event created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate(POPULATE);
    if (!event) return error(res, 'Event not found', 404);
    return success(res, event, 'Event updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return error(res, 'Event not found', 404);
    return success(res, { id: event._id }, 'Event deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove };
