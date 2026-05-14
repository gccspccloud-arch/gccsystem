/**
 * Recompute a member's Life Development Progress from attendance.
 *
 * For each category with autoMode === 'attendance':
 *   1. Count the member's attendance records where the target Meeting/Event
 *      has a type in linkedMeetingTypes/linkedEventTypes AND markedAt is
 *      within the rolling windowDays window.
 *   2. Walk thresholds sorted by minCount DESC; first row where count >=
 *      minCount wins. Save its optionLabel as the member's value.
 *
 * Manual categories are left untouched.
 */
const Attendance = require('../models/Attendance');
const Meeting = require('../models/Meeting');
const Event = require('../models/Event');
const LdpCategory = require('../models/LdpCategory');
const Member = require('../models/Member');

/**
 * For one category + member, count matching attendances within window.
 */
const countAttendanceForCategory = async (memberId, category) => {
  const since = new Date(Date.now() - category.windowDays * 24 * 60 * 60 * 1000);

  const meetingIds = category.linkedMeetingTypes?.length
    ? (await Meeting.find({ meetingType: { $in: category.linkedMeetingTypes } }).select('_id')).map((m) => m._id)
    : [];
  const eventIds = category.linkedEventTypes?.length
    ? (await Event.find({ eventType: { $in: category.linkedEventTypes } }).select('_id')).map((e) => e._id)
    : [];

  if (meetingIds.length === 0 && eventIds.length === 0) return 0;

  const orClauses = [];
  if (meetingIds.length) {
    orClauses.push({ 'target.kind': 'Meeting', 'target.ref': { $in: meetingIds } });
  }
  if (eventIds.length) {
    orClauses.push({ 'target.kind': 'Event', 'target.ref': { $in: eventIds } });
  }

  return Attendance.countDocuments({
    member: memberId,
    markedAt: { $gte: since },
    $or: orClauses,
  });
};

/**
 * Pick the option label that matches a count according to the category's
 * thresholds. Returns '' if no row matches (e.g. no thresholds defined).
 */
const bucketCount = (count, thresholds) => {
  const sorted = (thresholds || []).slice().sort((a, b) => b.minCount - a.minCount);
  for (const t of sorted) {
    if (count >= t.minCount) return t.optionLabel;
  }
  return '';
};

/**
 * Recompute a single member's auto LDP categories.
 * Returns { changed: [...], unchanged: [...], skipped: [...] }
 */
const recomputeMemberLdp = async (memberId, { userId = null } = {}) => {
  const member = await Member.findById(memberId);
  if (!member) throw new Error('Member not found');

  const categories = await LdpCategory.find({ autoMode: 'attendance', isActive: true });
  const now = new Date();
  const result = { changed: [], unchanged: [], skipped: [] };

  // Index existing LDP entries by category id for quick lookup.
  const ldpByCat = new Map(
    (member.ldp || []).map((entry) => [String(entry.category), entry])
  );

  for (const cat of categories) {
    if (!cat.thresholds || cat.thresholds.length === 0) {
      result.skipped.push({ category: cat.name, reason: 'no thresholds defined' });
      continue;
    }
    if ((cat.linkedMeetingTypes?.length || 0) + (cat.linkedEventTypes?.length || 0) === 0) {
      result.skipped.push({ category: cat.name, reason: 'no linked types' });
      continue;
    }

    const count = await countAttendanceForCategory(memberId, cat);
    const newValue = bucketCount(count, cat.thresholds);

    // Validate it's a real option on the category.
    const validLabels = cat.options.map((o) => o.label);
    if (newValue && !validLabels.includes(newValue)) {
      result.skipped.push({
        category: cat.name,
        reason: `threshold points to "${newValue}" but that's not an option on the category`,
      });
      continue;
    }

    const existing = ldpByCat.get(String(cat._id));
    if (!newValue) {
      // No threshold matched (e.g. count 0 with no zero-min row) — clear.
      if (existing) {
        member.ldp = member.ldp.filter((e) => String(e.category) !== String(cat._id));
        result.changed.push({ category: cat.name, from: existing.value, to: '(unset)', count });
      } else {
        result.unchanged.push({ category: cat.name, value: '(unset)', count });
      }
      continue;
    }

    if (existing && existing.value === newValue) {
      result.unchanged.push({ category: cat.name, value: newValue, count });
      continue;
    }

    if (existing) {
      existing.value = newValue;
      existing.updatedAt = now;
      existing.updatedBy = userId;
      result.changed.push({ category: cat.name, from: existing.value, to: newValue, count });
    } else {
      member.ldp.push({
        category: cat._id,
        value: newValue,
        updatedAt: now,
        updatedBy: userId,
      });
      result.changed.push({ category: cat.name, from: '(unset)', to: newValue, count });
    }
  }

  await member.save();
  return result;
};

/**
 * Recompute every member's auto categories. Returns aggregate stats.
 */
const recomputeAllMembersLdp = async ({ userId = null } = {}) => {
  const members = await Member.find().select('_id');
  let totalChanged = 0;
  let totalUnchanged = 0;
  const errors = [];

  for (const m of members) {
    try {
      const r = await recomputeMemberLdp(m._id, { userId });
      totalChanged += r.changed.length;
      totalUnchanged += r.unchanged.length;
    } catch (err) {
      errors.push({ memberId: m._id, error: err.message });
    }
  }

  return {
    membersProcessed: members.length,
    totalChanged,
    totalUnchanged,
    errors,
  };
};

/**
 * Direct LDP assignment from a meeting/event's `ldpAssignments` array.
 * Sets the member's value for each (category, optionLabel) pair, validating
 * that optionLabel is a real option on the category. Bypasses thresholds
 * entirely — staff explicitly said "this meeting = this LDP value."
 *
 * Used by the attendance trigger: when a member is marked present at a
 * meeting/event with ldpAssignments, those LDP values get written directly.
 */
const applyDirectLdpAssignments = async (memberId, assignments, { userId = null } = {}) => {
  if (!assignments || assignments.length === 0) return { applied: 0, skipped: 0 };

  const member = await Member.findById(memberId);
  if (!member) return { applied: 0, skipped: 0 };

  // Resolve and validate each assignment.
  const categoryIds = [...new Set(assignments.map((a) => String(a.category?._id || a.category)))];
  const categories = await LdpCategory.find({ _id: { $in: categoryIds } });
  const catMap = new Map(categories.map((c) => [String(c._id), c]));

  const now = new Date();
  let applied = 0;
  let skipped = 0;

  for (const a of assignments) {
    const catId = String(a.category?._id || a.category);
    const cat = catMap.get(catId);
    if (!cat) { skipped += 1; continue; }
    const validLabels = (cat.options || []).map((o) => o.label);
    if (!validLabels.includes(a.optionLabel)) { skipped += 1; continue; }

    const existing = member.ldp.find((e) => String(e.category) === catId);
    if (existing) {
      if (existing.value !== a.optionLabel) {
        existing.value = a.optionLabel;
        existing.updatedAt = now;
        existing.updatedBy = userId;
        applied += 1;
      }
    } else {
      member.ldp.push({
        category: cat._id,
        value: a.optionLabel,
        updatedAt: now,
        updatedBy: userId,
      });
      applied += 1;
    }
  }

  await member.save();
  return { applied, skipped };
};

module.exports = {
  recomputeMemberLdp,
  recomputeAllMembersLdp,
  applyDirectLdpAssignments,
  countAttendanceForCategory,
  bucketCount,
};
