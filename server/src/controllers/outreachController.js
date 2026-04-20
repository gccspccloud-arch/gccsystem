const Outreach = require('../models/Outreach');
const OutreachAttendee = require('../models/OutreachAttendee');
const OutreachSession = require('../models/OutreachSession');
const { success, error } = require('../utils/apiResponse');

const PERSON_FIELDS = 'firstName lastName email role memberStatus';

const POPULATE = [
  { path: 'createdBy', select: 'firstName lastName' },
  { path: 'teacher.ref', select: PERSON_FIELDS },
  { path: 'ministers.ref', select: PERSON_FIELDS },
];

const list = async (req, res, next) => {
  try {
    const { active } = req.query;
    const filter = {};
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;

    const items = await Outreach.find(filter).populate(POPULATE).sort({ name: 1 }).lean();

    // Tack on attendee/session counts so the list page can show them at a glance.
    const ids = items.map((o) => o._id);
    const [attendeeCounts, sessionCounts] = await Promise.all([
      OutreachAttendee.aggregate([
        { $match: { outreach: { $in: ids } } },
        { $group: { _id: '$outreach', count: { $sum: 1 } } },
      ]),
      OutreachSession.aggregate([
        { $match: { outreach: { $in: ids } } },
        { $group: { _id: '$outreach', count: { $sum: 1 }, latest: { $max: '$scheduledAt' } } },
      ]),
    ]);
    const aMap = new Map(attendeeCounts.map((x) => [String(x._id), x.count]));
    const sMap = new Map(sessionCounts.map((x) => [String(x._id), x]));

    const enriched = items.map((o) => ({
      ...o,
      attendeeCount: aMap.get(String(o._id)) || 0,
      sessionCount: sMap.get(String(o._id))?.count || 0,
      latestSessionAt: sMap.get(String(o._id))?.latest || null,
    }));

    return success(res, enriched, 'Outreaches fetched');
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await Outreach.findById(req.params.id).populate(POPULATE);
    if (!item) return error(res, 'Outreach not found', 404);
    return success(res, item, 'Outreach fetched');
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
    const item = await Outreach.create(payload);
    await item.populate(POPULATE);
    return success(res, item, 'Outreach created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await Outreach.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate(POPULATE);
    if (!item) return error(res, 'Outreach not found', 404);
    return success(res, item, 'Outreach updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    // Soft check: prevent deletion if there are attendees or sessions tied.
    const [a, s] = await Promise.all([
      OutreachAttendee.countDocuments({ outreach: req.params.id }),
      OutreachSession.countDocuments({ outreach: req.params.id }),
    ]);
    if (a > 0 || s > 0) {
      return error(res, `Cannot delete — outreach has ${a} attendee(s) and ${s} session(s). Remove them first.`, 400);
    }
    const item = await Outreach.findByIdAndDelete(req.params.id);
    if (!item) return error(res, 'Outreach not found', 404);
    return success(res, { id: item._id }, 'Outreach deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove };
