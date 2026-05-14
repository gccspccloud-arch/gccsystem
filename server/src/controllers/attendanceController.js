const Attendance = require('../models/Attendance');
const Meeting = require('../models/Meeting');
const Event = require('../models/Event');
const OutreachSession = require('../models/OutreachSession');
const Member = require('../models/Member');
const { recomputeMemberLdp, applyDirectLdpAssignments } = require('../services/ldpRecompute');
const { success, error } = require('../utils/apiResponse');

/**
 * Fire-and-forget LDP update for a member who was just marked present (or
 * absent) at a target. Two paths:
 *   1. Direct: if the target has ldpAssignments, write those values directly.
 *   2. Threshold: also recompute auto categories from attendance counts.
 * The two coexist — direct assignments take precedence inside applyDirect,
 * then recompute fills in any other auto categories not directly assigned.
 */
const triggerLdpUpdate = (memberId, userId, target) => {
  if (!memberId) return;
  const assignments = (target && Array.isArray(target.ldpAssignments)) ? target.ldpAssignments : [];
  setImmediate(async () => {
    try {
      if (assignments.length > 0) {
        await applyDirectLdpAssignments(memberId, assignments, { userId });
      }
      await recomputeMemberLdp(memberId, { userId });
    } catch (err) {
      console.error(`[LDP] auto-update failed for member ${memberId}:`, err.message);
    }
  });
};

const TARGET_MODELS = { Meeting, Event, OutreachSession };

const loadTarget = async (kind, id) => {
  const Model = TARGET_MODELS[kind];
  if (!Model) return null;
  return Model.findById(id);
};

/**
 * Authorization: super_admin / admin can always mark attendance.
 * Otherwise the user must be the assigned User-kind teacher or one of the
 * assigned User-kind ministers on that target.
 */
const userCanMark = (user, target) => {
  if (!target) return false;
  if (user.role === 'super_admin' || user.role === 'admin') return true;

  const uid = String(user._id);
  const teacher = target.teacher;
  if (teacher && teacher.kind === 'User') {
    const tref = teacher.ref?._id || teacher.ref;
    if (tref && String(tref) === uid) return true;
  }

  for (const m of target.ministers || []) {
    if (m.kind === 'User') {
      const mref = m.ref?._id || m.ref;
      if (mref && String(mref) === uid) return true;
    }
  }
  return false;
};

const list = async (req, res, next) => {
  try {
    const { targetKind, targetRef } = req.query;
    if (!targetKind || !targetRef) {
      return error(res, 'targetKind and targetRef are required', 400);
    }
    const records = await Attendance.find({
      'target.kind': targetKind,
      'target.ref': targetRef,
    })
      .populate({ path: 'member', select: 'firstName lastName middleName memberStatus' })
      .populate({ path: 'markedBy', select: 'firstName lastName' })
      .sort({ markedAt: -1 });
    return success(res, records, 'Attendance fetched');
  } catch (err) {
    next(err);
  }
};

const toggleMember = async (req, res, next) => {
  try {
    const { targetKind, targetRef, member, enteredAt } = req.body;

    const target = await loadTarget(targetKind, targetRef);
    if (!target) return error(res, `${targetKind} not found`, 404);
    if (!userCanMark(req.user, target)) {
      return error(res, 'You are not authorized to take attendance for this', 403);
    }

    const filter = { 'target.kind': targetKind, 'target.ref': targetRef, member };
    const existing = await Attendance.findOne(filter);

    if (existing) {
      await existing.deleteOne();
      // On removal we only recompute thresholds — direct assignments don't
      // "un-set" because the staff's intent was an explicit assignment.
      triggerLdpUpdate(member, req.user._id, null);
      return success(res, { action: 'removed', id: existing._id }, 'Attendance removed');
    }

    const record = await Attendance.create({
      target: { kind: targetKind, ref: targetRef },
      member,
      markedBy: req.user._id,
      markedAt: new Date(),
      enteredAt: enteredAt ? new Date(enteredAt) : null,
    });
    await record.populate([
      { path: 'member', select: 'firstName lastName middleName memberStatus' },
      { path: 'markedBy', select: 'firstName lastName' },
    ]);
    triggerLdpUpdate(member, req.user._id, target);
    return success(res, { action: 'created', record }, 'Attendance recorded', 201);
  } catch (err) {
    next(err);
  }
};

const addVisitor = async (req, res, next) => {
  try {
    const { targetKind, targetRef, visitorName, visitorAddress, visitorContactNumber, enteredAt } = req.body;

    const target = await loadTarget(targetKind, targetRef);
    if (!target) return error(res, `${targetKind} not found`, 404);
    if (!userCanMark(req.user, target)) {
      return error(res, 'You are not authorized to take attendance for this', 403);
    }

    const record = await Attendance.create({
      target: { kind: targetKind, ref: targetRef },
      visitorName: visitorName.trim(),
      visitorAddress: (visitorAddress || '').trim(),
      visitorContactNumber: (visitorContactNumber || '').trim(),
      markedBy: req.user._id,
      markedAt: new Date(),
      enteredAt: enteredAt ? new Date(enteredAt) : null,
    });
    await record.populate({ path: 'markedBy', select: 'firstName lastName' });
    return success(res, record, 'Visitor recorded', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /attendance/:id/promote
 * Promote the visitor on an attendance record into a full Member.
 * Back-fills all OTHER attendance records with the same visitorName
 * (+ contact number, if present) so their past attendance follows them.
 */
const promoteVisitor = async (req, res, next) => {
  try {
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      return error(res, 'Only admins can promote visitors', 403);
    }

    const record = await Attendance.findById(req.params.id);
    if (!record) return error(res, 'Attendance record not found', 404);
    if (record.member) return error(res, 'This record is already linked to a member', 400);
    if (!record.visitorName) return error(res, 'No visitor name on this record', 400);

    const overrides = req.body || {};
    const [firstName, ...rest] = record.visitorName.trim().split(/\s+/);
    const lastName = rest.length ? rest.pop() : firstName;
    const middleName = rest.join(' ');

    const memberPayload = {
      lastName: overrides.lastName || lastName || firstName,
      firstName: overrides.firstName || firstName,
      middleName: overrides.middleName ?? middleName ?? '',
      gender: overrides.gender,
      birthdate: overrides.birthdate,
      civilStatus: overrides.civilStatus || 'Single',
      contactNumber: overrides.contactNumber || record.visitorContactNumber || undefined,
      permanentAddress: overrides.permanentAddress || record.visitorAddress || 'N/A',
      presentAddress: overrides.presentAddress || '',
      memberStatus: overrides.memberStatus || 'New Attendee',
    };

    if (!memberPayload.gender) return error(res, 'Gender is required to promote', 400);
    if (!memberPayload.birthdate) return error(res, 'Birthdate is required to promote', 400);

    const newMember = await Member.create(memberPayload);

    // Back-fill: all visitor records with same name (+ contact if we have one).
    const nameRx = new RegExp(`^${record.visitorName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const filter = { member: null, visitorName: { $regex: nameRx } };
    if (record.visitorContactNumber) filter.visitorContactNumber = record.visitorContactNumber;

    const update = await Attendance.updateMany(filter, {
      $set: {
        member: newMember._id,
        visitorName: '',
        visitorAddress: '',
        visitorContactNumber: '',
      },
    });

    triggerLdpUpdate(newMember._id, req.user._id, null);
    return success(res, {
      member: newMember,
      migratedRecords: update.modifiedCount || 0,
    }, 'Visitor promoted to Member', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /attendance/:id/time
 * Set or clear the optional enteredAt time. Same authorization rules as
 * marking attendance — teacher / minister of the target, or admin.
 */
const updateTime = async (req, res, next) => {
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) return error(res, 'Attendance record not found', 404);

    const target = await loadTarget(record.target.kind, record.target.ref);
    if (!userCanMark(req.user, target)) {
      return error(res, 'You are not authorized to edit this record', 403);
    }

    const { enteredAt } = req.body || {};
    record.enteredAt = enteredAt ? new Date(enteredAt) : null;
    await record.save();
    await record.populate([
      { path: 'member', select: 'firstName lastName middleName memberStatus' },
      { path: 'markedBy', select: 'firstName lastName' },
    ]);
    return success(res, record, 'Time updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) return error(res, 'Attendance record not found', 404);

    const target = await loadTarget(record.target.kind, record.target.ref);
    if (!userCanMark(req.user, target)) {
      return error(res, 'You are not authorized to remove this record', 403);
    }
    const memberRef = record.member;
    await record.deleteOne();
    triggerLdpUpdate(memberRef, req.user._id, null);
    return success(res, { id: record._id }, 'Attendance removed');
  } catch (err) {
    next(err);
  }
};

const byMember = async (req, res, next) => {
  try {
    const records = await Attendance.find({ member: req.params.memberId })
      .populate({ path: 'target.ref', select: 'title scheduledAt eventType meetingType locationType location' })
      .sort({ markedAt: -1 })
      .limit(100);
    return success(res, records, 'Member attendance history');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, toggleMember, addVisitor, promoteVisitor, updateTime, remove, byMember };
