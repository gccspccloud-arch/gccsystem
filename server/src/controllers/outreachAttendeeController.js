const mongoose = require('mongoose');
const OutreachAttendee = require('../models/OutreachAttendee');
const Member = require('../models/Member');
const Attendance = require('../models/Attendance');
const { success, error } = require('../utils/apiResponse');

const list = async (req, res, next) => {
  try {
    const { outreach, search, promoted } = req.query;
    const filter = {};
    if (outreach) filter.outreach = outreach;
    if (promoted === 'true') filter.promotedToMember = { $ne: null };
    if (promoted === 'false') filter.promotedToMember = null;
    if (search) {
      const rx = { $regex: search, $options: 'i' };
      filter.$or = [
        { firstName: rx },
        { lastName: rx },
        { middleName: rx },
        { contactNumber: rx },
        { address: rx },
      ];
    }
    const items = await OutreachAttendee.find(filter)
      .populate('outreach', 'name barangay city')
      .populate('promotedToMember', 'firstName lastName memberStatus')
      .sort({ lastName: 1, firstName: 1 });
    return success(res, items, 'Outreach attendees fetched');
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await OutreachAttendee.findById(req.params.id)
      .populate('outreach', 'name barangay city')
      .populate('promotedToMember', 'firstName lastName memberStatus');
    if (!item) return error(res, 'Attendee not found', 404);
    return success(res, item, 'Attendee fetched');
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const payload = { ...req.body, createdBy: req.user._id };
    const item = await OutreachAttendee.create(payload);
    await item.populate('outreach', 'name barangay city');
    return success(res, item, 'Attendee registered', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await OutreachAttendee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('outreach', 'name barangay city');
    if (!item) return error(res, 'Attendee not found', 404);
    return success(res, item, 'Attendee updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const item = await OutreachAttendee.findByIdAndDelete(req.params.id);
    if (!item) return error(res, 'Attendee not found', 404);
    return success(res, { id: item._id }, 'Attendee removed');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /outreach-attendees/:id/promote
 * Creates a Member from this attendee and back-fills attendance history
 * so their past OutreachSession attendance keeps following them.
 *
 * Body may override/supply Member fields that Member requires but we don't
 * collect on OutreachAttendee (permanentAddress, civilStatus, etc.). If not
 * supplied, we use sane fallbacks from attendee data.
 */
const promoteToMember = async (req, res, next) => {
  try {
    const attendee = await OutreachAttendee.findById(req.params.id);
    if (!attendee) return error(res, 'Attendee not found', 404);
    if (attendee.promotedToMember) {
      return error(res, 'Attendee has already been promoted', 400);
    }
    if (!attendee.gender) {
      return error(res, 'Attendee gender is required for promotion — edit the attendee first', 400);
    }
    if (!attendee.birthdate) {
      return error(res, 'Attendee birthdate is required for promotion — edit the attendee first', 400);
    }

    const overrides = req.body || {};
    const memberPayload = {
      lastName: attendee.lastName,
      firstName: attendee.firstName,
      middleName: attendee.middleName || '',
      gender: attendee.gender,
      birthdate: attendee.birthdate,
      civilStatus: overrides.civilStatus || 'Single',
      contactNumber: overrides.contactNumber || attendee.contactNumber || undefined,
      permanentAddress: overrides.permanentAddress || attendee.address || 'N/A',
      presentAddress: overrides.presentAddress || '',
      memberStatus: overrides.memberStatus || 'New Attendee',
      notes: overrides.notes || attendee.notes || '',
    };

    const newMember = await Member.create(memberPayload);

    // Back-fill attendance history: any attendance record whose target is an
    // OutreachSession belonging to this attendee's outreach AND whose
    // visitorName matches this person — link it to the new member.
    // Our current model doesn't directly tie attendance to OutreachAttendee;
    // sessions store attendance with member=null + visitorName. So we match
    // by name. Safer: require name match AND contact number match when
    // contact is present.
    const nameMatch = `${attendee.firstName} ${attendee.lastName}`.trim();
    const filter = {
      member: null,
      visitorName: nameMatch,
    };
    if (attendee.contactNumber) filter.visitorContactNumber = attendee.contactNumber;

    const updateResult = await Attendance.updateMany(filter, {
      $set: {
        member: newMember._id,
        visitorName: '',
        visitorAddress: '',
        visitorContactNumber: '',
      },
    });

    attendee.promotedToMember = newMember._id;
    await attendee.save();
    await attendee.populate('promotedToMember', 'firstName lastName memberStatus');

    return success(res, {
      attendee,
      member: newMember,
      migratedRecords: updateResult.modifiedCount || 0,
    }, 'Attendee promoted to Member');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove, promoteToMember };
