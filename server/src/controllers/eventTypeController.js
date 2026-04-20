const EventType = require('../models/EventType');
const Event = require('../models/Event');
const { success, error } = require('../utils/apiResponse');

const list = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { isActive: true };
    const items = await EventType.find(filter).sort({ name: 1 });
    return success(res, items, 'Event types fetched');
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const exists = await EventType.findOne({ name: new RegExp(`^${req.body.name}$`, 'i') });
    if (exists) return error(res, 'An event type with that name already exists', 409);
    const item = await EventType.create({ ...req.body, createdBy: req.user._id });
    return success(res, item, 'Event type created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    if (req.body.name) {
      const exists = await EventType.findOne({
        _id: { $ne: req.params.id },
        name: new RegExp(`^${req.body.name}$`, 'i'),
      });
      if (exists) return error(res, 'An event type with that name already exists', 409);
    }
    const item = await EventType.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) return error(res, 'Event type not found', 404);
    return success(res, item, 'Event type updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const inUse = await Event.countDocuments({ eventType: req.params.id });
    if (inUse > 0) {
      return error(
        res,
        `Cannot delete: this type is used by ${inUse} event(s). Deactivate it instead.`,
        400,
      );
    }
    const item = await EventType.findByIdAndDelete(req.params.id);
    if (!item) return error(res, 'Event type not found', 404);
    return success(res, { id: item._id }, 'Event type deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove };
