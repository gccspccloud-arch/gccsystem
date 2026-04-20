const mongoose = require('mongoose');
const Member = require('../models/Member');
const Meeting = require('../models/Meeting');
const Event = require('../models/Event');
const Attendance = require('../models/Attendance');
const Announcement = require('../models/Announcement');
const Outreach = require('../models/Outreach');
const OutreachSession = require('../models/OutreachSession');
const OutreachAttendee = require('../models/OutreachAttendee');
const { success, error } = require('../utils/apiResponse');

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/**
 * The "when" of an attendance record is the date of the meeting/event it
 * refers to — NOT when the checkbox was ticked. A record logged two weeks
 * later for a March 29 service should still report as March 29 attendance.
 * Fall back to markedAt only if the target is missing / unpopulated.
 */
const eventDate = (record) => {
  const s = record.target?.ref?.scheduledAt;
  return s ? new Date(s) : new Date(record.markedAt);
};

const inRange = (date, from, to) => {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
};

/**
 * GET /reports/dashboard
 * High-level snapshot for the homepage / dashboard view.
 */
const dashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const today0 = startOfDay(now);
    const weekEnd = endOfDay(addDays(now, 6));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    const [
      totalMembers,
      membersByStatusAgg,
      membersByGenderAgg,
      upcomingMeetings,
      upcomingEvents,
      allAttendance,
      announcementCount,
    ] = await Promise.all([
      Member.countDocuments({}),
      Member.aggregate([{ $group: { _id: '$memberStatus', count: { $sum: 1 } } }]),
      Member.aggregate([{ $group: { _id: '$gender', count: { $sum: 1 } } }]),
      Meeting.find({ scheduledAt: { $gte: today0, $lte: weekEnd } })
        .sort({ scheduledAt: 1 })
        .limit(10)
        .populate('meetingType', 'name')
        .lean(),
      Event.find({ scheduledAt: { $gte: today0, $lte: weekEnd } })
        .sort({ scheduledAt: 1 })
        .limit(10)
        .populate('eventType', 'name')
        .lean(),
      // Pull populated attendance so we can filter by event date in JS.
      Attendance.find({})
        .populate({ path: 'member', select: 'firstName lastName memberStatus' })
        .populate({ path: 'target.ref', select: 'title scheduledAt' })
        .lean(),
      Announcement.countDocuments({}),
    ]);

    const byStatus = { 'New Attendee': 0, 'Regular Attendee': 0, Member: 0 };
    membersByStatusAgg.forEach((r) => { byStatus[r._id] = r.count; });

    const byGender = { Male: 0, Female: 0 };
    membersByGenderAgg.forEach((r) => { byGender[r._id] = r.count; });

    // Month-to-date counts by event date (not markedAt).
    let attendanceThisMonth = 0;
    let visitorsThisMonth = 0;
    allAttendance.forEach((r) => {
      const when = eventDate(r);
      if (when >= monthStart && when <= monthEnd) {
        if (r.member) attendanceThisMonth += 1;
        else visitorsThisMonth += 1;
      }
    });

    // Recent attendance = records for the most recently scheduled events.
    const recentAttendance = [...allAttendance]
      .sort((a, b) => eventDate(b) - eventDate(a))
      .slice(0, 10);

    const celebrants = await celebrantsBetween(today0, weekEnd);

    return success(res, {
      members: { total: totalMembers, byStatus, byGender },
      upcoming: { meetings: upcomingMeetings, events: upcomingEvents },
      attendanceThisMonth: { members: attendanceThisMonth, visitors: visitorsThisMonth },
      recentAttendance,
      celebrantsThisWeek: celebrants,
      announcements: announcementCount,
      generatedAt: now,
    }, 'Dashboard data');
  } catch (err) {
    next(err);
  }
};

/**
 * Build a flat list of celebrants whose birthday or anniversary
 * (month/day) lands within [start, end] in the current year window.
 */
const celebrantsBetween = async (start, end) => {
  const members = await Member.find({}, 'firstName lastName middleName birthdate civilStatus dateOfMarriage spouse')
    .lean();

  const items = [];
  const days = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  while (cursor <= last) {
    days.push({ m: cursor.getMonth(), d: cursor.getDate(), date: new Date(cursor) });
    cursor.setDate(cursor.getDate() + 1);
  }
  const dayKey = (m, d) => `${m}-${d}`;
  const dayMap = new Map(days.map((x) => [dayKey(x.m, x.d), x.date]));

  members.forEach((mem) => {
    if (mem.birthdate) {
      const b = new Date(mem.birthdate);
      const hit = dayMap.get(dayKey(b.getMonth(), b.getDate()));
      if (hit) {
        items.push({
          type: 'birthday',
          member: { _id: mem._id, firstName: mem.firstName, lastName: mem.lastName, middleName: mem.middleName },
          date: hit,
          original: mem.birthdate,
          age: hit.getFullYear() - b.getFullYear(),
        });
      }
    }
    if (mem.civilStatus === 'Married' && mem.dateOfMarriage) {
      const a = new Date(mem.dateOfMarriage);
      const hit = dayMap.get(dayKey(a.getMonth(), a.getDate()));
      if (hit) {
        items.push({
          type: 'anniversary',
          member: { _id: mem._id, firstName: mem.firstName, lastName: mem.lastName, middleName: mem.middleName },
          spouse: mem.spouse || '',
          date: hit,
          original: mem.dateOfMarriage,
          years: hit.getFullYear() - a.getFullYear(),
        });
      }
    }
  });

  items.sort((a, b) => a.date - b.date);
  return items;
};

const celebrants = async (req, res, next) => {
  try {
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const from = req.query.from ? startOfDay(req.query.from) : defaultStart;
    const to = req.query.to ? endOfDay(req.query.to) : defaultEnd;
    const items = await celebrantsBetween(from, to);
    return success(res, { from, to, items }, 'Celebrants');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /reports/attendance
 * Date filters apply to the event's scheduledAt, not the markedAt timestamp.
 */
const attendanceReport = async (req, res, next) => {
  try {
    const { from, to, targetKind, targetRef, memberStatus, includeVisitors = 'true', memberId } = req.query;

    const match = {};
    if (targetKind) match['target.kind'] = targetKind;
    if (targetRef) match['target.ref'] = new mongoose.Types.ObjectId(targetRef);
    if (memberId) match.member = new mongoose.Types.ObjectId(memberId);
    if (includeVisitors === 'false') match.member = { $ne: null };
    else if (includeVisitors === 'only') match.member = null;

    const records = await Attendance.find(match)
      .populate({ path: 'member', select: 'firstName lastName middleName memberStatus gender' })
      .populate({ path: 'target.ref', select: 'title scheduledAt locationType location' })
      .populate({ path: 'markedBy', select: 'firstName lastName' })
      .lean();

    const fromDate = from ? startOfDay(from) : null;
    const toDate = to ? endOfDay(to) : null;

    let filtered = records.filter((r) => inRange(eventDate(r), fromDate, toDate));
    if (memberStatus) {
      filtered = filtered.filter((r) => r.member && r.member.memberStatus === memberStatus);
    }
    // Sort by event date desc.
    filtered.sort((a, b) => eventDate(b) - eventDate(a));

    const summary = {
      totalRecords: filtered.length,
      memberRecords: filtered.filter((r) => r.member).length,
      visitorRecords: filtered.filter((r) => !r.member).length,
      byStatus: { 'New Attendee': 0, 'Regular Attendee': 0, Member: 0 },
      byTargetKind: { Meeting: 0, Event: 0, OutreachSession: 0 },
    };
    filtered.forEach((r) => {
      if (r.member?.memberStatus && summary.byStatus[r.member.memberStatus] != null) {
        summary.byStatus[r.member.memberStatus] += 1;
      }
      if (summary.byTargetKind[r.target?.kind] != null) {
        summary.byTargetKind[r.target.kind] += 1;
      }
    });

    return success(res, { records: filtered, summary }, 'Attendance report');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /reports/member-attendance-summary
 * Per-member attendance counts within range by EVENT date.
 */
const memberAttendanceSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? startOfDay(from) : null;
    const toDate = to ? endOfDay(to) : null;

    const records = await Attendance.find({ member: { $ne: null } })
      .populate({ path: 'member', select: 'firstName lastName middleName memberStatus gender' })
      .populate({ path: 'target.ref', select: 'scheduledAt' })
      .lean();

    const perMember = new Map();
    records.forEach((r) => {
      const when = eventDate(r);
      if (!inRange(when, fromDate, toDate)) return;
      const id = String(r.member._id);
      if (!perMember.has(id)) {
        perMember.set(id, {
          memberId: r.member._id,
          firstName: r.member.firstName,
          lastName: r.member.lastName,
          middleName: r.member.middleName,
          memberStatus: r.member.memberStatus,
          gender: r.member.gender,
          attendances: 0,
          lastAttended: when,
        });
      }
      const row = perMember.get(id);
      row.attendances += 1;
      if (when > row.lastAttended) row.lastAttended = when;
    });

    const rows = Array.from(perMember.values()).sort((a, b) => {
      if (b.attendances !== a.attendances) return b.attendances - a.attendances;
      return (a.lastName || '').localeCompare(b.lastName || '');
    });

    return success(res, rows, 'Member attendance summary');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /reports/outreach
 * Per-outreach summary: sessions held, total attendances, member vs visitor
 * counts, distinct attendee count, last session date — all keyed off the
 * session's scheduledAt (event date), within optional [from, to].
 * Also returns per-attendee rows for the chosen outreach if `outreach` is set.
 */
const outreachReport = async (req, res, next) => {
  try {
    const { from, to, outreach } = req.query;
    const fromDate = from ? startOfDay(from) : null;
    const toDate = to ? endOfDay(to) : null;

    const outreaches = outreach
      ? await Outreach.find({ _id: outreach }).lean()
      : await Outreach.find({}).sort({ name: 1 }).lean();
    if (!outreaches.length) return success(res, { rows: [], attendees: [] }, 'Outreach report');

    const ids = outreaches.map((o) => o._id);

    // Pull all sessions for these outreaches (in range).
    const sessionFilter = { outreach: { $in: ids } };
    if (fromDate || toDate) {
      sessionFilter.scheduledAt = {};
      if (fromDate) sessionFilter.scheduledAt.$gte = fromDate;
      if (toDate) sessionFilter.scheduledAt.$lte = toDate;
    }
    const sessions = await OutreachSession.find(sessionFilter).select('_id outreach scheduledAt title').lean();
    const sessionsByOutreach = new Map();
    const sessionIds = [];
    sessions.forEach((s) => {
      sessionIds.push(s._id);
      const arr = sessionsByOutreach.get(String(s.outreach)) || [];
      arr.push(s);
      sessionsByOutreach.set(String(s.outreach), arr);
    });

    // Pull all attendance records pointed at those sessions.
    const records = sessionIds.length
      ? await Attendance.find({ 'target.kind': 'OutreachSession', 'target.ref': { $in: sessionIds } })
          .populate({ path: 'member', select: 'firstName lastName middleName memberStatus' })
          .populate({ path: 'target.ref', select: 'outreach scheduledAt title' })
          .lean()
      : [];

    const rows = outreaches.map((o) => {
      const oid = String(o._id);
      const sList = sessionsByOutreach.get(oid) || [];
      const recs = records.filter((r) => String(r.target?.ref?.outreach) === oid);
      const memberCount = recs.filter((r) => r.member).length;
      const visitorCount = recs.filter((r) => !r.member).length;
      const distinctMembers = new Set(recs.filter((r) => r.member).map((r) => String(r.member._id))).size;
      const lastSession = sList.reduce((acc, s) => (!acc || s.scheduledAt > acc ? s.scheduledAt : acc), null);
      return {
        outreach: { _id: o._id, name: o.name, barangay: o.barangay, city: o.city, isActive: o.isActive },
        sessions: sList.length,
        attendances: recs.length,
        memberAttendances: memberCount,
        visitorAttendances: visitorCount,
        distinctMembers,
        lastSession,
      };
    });

    // Per-attendee breakdown only when scoped to one outreach.
    let attendees = [];
    if (outreach) {
      const roster = await OutreachAttendee.find({ outreach }).lean();
      const recs = records;

      // Count visitor attendances by (lowercased) name+contact match.
      const matchKey = (name, contact) =>
        `${(name || '').trim().toLowerCase()}|${(contact || '').trim()}`;

      const visitorCounts = new Map();
      const memberCounts = new Map();
      recs.forEach((r) => {
        if (r.member) {
          const id = String(r.member._id);
          memberCounts.set(id, (memberCounts.get(id) || 0) + 1);
        } else if (r.visitorName) {
          const k = matchKey(r.visitorName, r.visitorContactNumber);
          visitorCounts.set(k, (visitorCounts.get(k) || 0) + 1);
        }
      });

      attendees = roster.map((a) => {
        const fullName = `${a.firstName} ${a.lastName}`;
        const visitorMatch = visitorCounts.get(matchKey(fullName, a.contactNumber)) || 0;
        const memberMatch = a.promotedToMember
          ? memberCounts.get(String(a.promotedToMember)) || 0
          : 0;
        return {
          _id: a._id,
          firstName: a.firstName,
          lastName: a.lastName,
          middleName: a.middleName,
          gender: a.gender,
          contactNumber: a.contactNumber,
          promotedToMember: a.promotedToMember || null,
          attendances: visitorMatch + memberMatch,
        };
      }).sort((x, y) => y.attendances - x.attendances || (x.lastName || '').localeCompare(y.lastName || ''));
    }

    return success(res, { rows, attendees }, 'Outreach report');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  dashboard,
  celebrants,
  attendanceReport,
  memberAttendanceSummary,
  outreachReport,
};
