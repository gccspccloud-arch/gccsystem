const MeetingType = require('../models/MeetingType');
const Meeting = require('../models/Meeting');
const { success, error } = require('../utils/apiResponse');

const list = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { isActive: true };
    const items = await MeetingType.find(filter).sort({ name: 1 });
    return success(res, items, 'Meeting types fetched');
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const exists = await MeetingType.findOne({ name: new RegExp(`^${req.body.name}$`, 'i') });
    if (exists) return error(res, 'A meeting type with that name already exists', 409);
    const item = await MeetingType.create({ ...req.body, createdBy: req.user._id });
    return success(res, item, 'Meeting type created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    if (req.body.name) {
      const exists = await MeetingType.findOne({
        _id: { $ne: req.params.id },
        name: new RegExp(`^${req.body.name}$`, 'i'),
      });
      if (exists) return error(res, 'A meeting type with that name already exists', 409);
    }
    const item = await MeetingType.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) return error(res, 'Meeting type not found', 404);
    return success(res, item, 'Meeting type updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const inUse = await Meeting.countDocuments({ meetingType: req.params.id });
    if (inUse > 0) {
      return error(
        res,
        `Cannot delete: this type is used by ${inUse} meeting(s). Deactivate it instead.`,
        400,
      );
    }
    const item = await MeetingType.findByIdAndDelete(req.params.id);
    if (!item) return error(res, 'Meeting type not found', 404);
    return success(res, { id: item._id }, 'Meeting type deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove };
