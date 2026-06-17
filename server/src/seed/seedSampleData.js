/**
 * Populate sample data for report testing.
 * Creates meetings, events, outreach sessions, attendance records,
 * and patches members with birthdays + marriage dates.
 *
 * SAFE TO RE-RUN: skips if sample meetings already exist (checks title prefix).
 * Run:  node src/seed/seedSampleData.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Member = require('../models/Member');
const User = require('../models/User');
const Meeting = require('../models/Meeting');
const Event = require('../models/Event');
const MeetingType = require('../models/MeetingType');
const EventType = require('../models/EventType');
const Attendance = require('../models/Attendance');
const Outreach = require('../models/Outreach');
const OutreachSession = require('../models/OutreachSession');

// ---- Helpers ----------------------------------------------------------------

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
};
const daysBefore = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(9 + Math.floor(Math.random() * 4), Math.random() > 0.5 ? 0 : 30, 0, 0);
  return d;
};
const daysAfter = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9 + Math.floor(Math.random() * 4), 0, 0, 0);
  return d;
};

// ---- Main -------------------------------------------------------------------

const run = async () => {
  await connectDB();

  // Check if sample data already seeded
  const existing = await Meeting.countDocuments({ title: /^\[Sample\]/ });
  if (existing > 0) {
    console.log(`[Seed] Sample data already exists (${existing} sample meetings). Skipping.`);
    process.exit(0);
  }

  // Fetch all required references
  const members = await Member.find({}).lean();
  const admin = await User.findOne({ role: 'super_admin' }).lean();
  if (!admin) {
    console.error('[Seed] No super_admin User found. Run seed:admin first.');
    process.exit(1);
  }
  if (members.length < 10) {
    console.error(`[Seed] Only ${members.length} members found. Run seed:members first.`);
    process.exit(1);
  }

  const meetingTypes = await MeetingType.find({}).lean();
  const eventTypes = await EventType.find({}).lean();
  if (!meetingTypes.length || !eventTypes.length) {
    console.error('[Seed] No meeting/event types. Run seed:meeting-types and seed:event-types first.');
    process.exit(1);
  }

  const mtByName = (name) => meetingTypes.find((t) => t.name === name) || meetingTypes[0];
  const etByName = (name) => eventTypes.find((t) => t.name === name) || eventTypes[0];

  const teacherRef = { kind: 'User', ref: admin._id };
  const createdBy = admin._id;

  console.log(`[Seed] Found ${members.length} members, ${meetingTypes.length} meeting types, ${eventTypes.length} event types.`);

  // =========================================================================
  // 1. PATCH MEMBERS — marriage dates only (birthdates come from the
  //    Google Sheet import and must NOT be overwritten)
  // =========================================================================
  console.log('[Seed] Patching married members with wedding dates (where missing)...');

  const currentMonth = new Date().getMonth(); // 0-based
  let marriagePatches = 0;

  for (let i = 0; i < members.length; i++) {
    const m = members[i];

    // Only fill in dateOfMarriage for married members who don't have one yet
    if (m.civilStatus === 'Married' && !m.dateOfMarriage) {
      const weddingYear = 2005 + Math.floor(Math.random() * 15);
      // Spread across the year; first few get this month for the celebrants report
      const wMonth = marriagePatches < 5 ? currentMonth : Math.floor(Math.random() * 12);
      const wDay = 1 + Math.floor(Math.random() * 28);

      const updates = { dateOfMarriage: new Date(weddingYear, wMonth, wDay) };
      if (!m.spouse) {
        updates.spouse = pick([
          'Maria', 'Jose', 'Anna', 'Pedro', 'Grace', 'John', 'Ruth', 'Mark',
          'Elena', 'Carlo', 'Liza', 'Michael', 'Rachel', 'Daniel',
        ]);
      }
      await Member.updateOne({ _id: m._id }, { $set: updates });
      marriagePatches++;
    }
  }
  console.log(`[Seed] ✓ ${marriagePatches} married members patched with wedding dates.`);

  // =========================================================================
  // 2. CREATE MEETINGS (past 6 weeks — 2 per week)
  // =========================================================================
  console.log('[Seed] Creating sample meetings...');

  const meetingSchedule = [
    { type: 'DG', label: 'Discipleship Group', day: 'Wed' },
    { type: 'LH', label: 'Life Huddle', day: 'Wed' },
    { type: 'Prayer Meeting', label: 'Prayer Meeting', day: 'Thu' },
    { type: 'Prayer Watch', label: 'Prayer Watch', day: 'Fri' },
    { type: 'PDL', label: 'PDL Session', day: 'Sat' },
  ];

  const createdMeetings = [];
  for (let week = 0; week < 6; week++) {
    for (const sched of meetingSchedule) {
      const daysAgo = week * 7 + (Math.floor(Math.random() * 2));
      const scheduledAt = daysBefore(daysAgo);
      const mt = mtByName(sched.type);

      const meeting = await Meeting.create({
        title: `[Sample] ${sched.label} — Week ${6 - week}`,
        meetingType: mt._id,
        teacher: teacherRef,
        ministers: [],
        scheduledAt,
        durationMinutes: 60 + Math.floor(Math.random() * 30),
        locationType: 'Onsite',
        location: 'GCC Chapel, San Pablo City',
        ldpAssignments: [],
        createdBy,
      });
      createdMeetings.push(meeting);
    }
  }
  console.log(`[Seed] ✓ ${createdMeetings.length} sample meetings created.`);

  // =========================================================================
  // 3. CREATE EVENTS (past 6 Sundays — Worship Service Onsite & Online)
  // =========================================================================
  console.log('[Seed] Creating sample events...');

  const etOnsite = etByName('Worship Service (Onsite)');
  const etOnline = etByName('Worship Service (Online)');

  const createdEvents = [];
  for (let week = 0; week < 6; week++) {
    // Find the Sunday that was `week` weeks ago
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday
    const daysToLastSunday = currentDay + (week * 7);
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - daysToLastSunday);
    sunday.setHours(9, 0, 0, 0);

    const onsiteEvent = await Event.create({
      title: `[Sample] Worship Service (Onsite) — ${sunday.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`,
      eventType: etOnsite._id,
      teacher: teacherRef,
      ministers: [],
      scheduledAt: sunday,
      durationMinutes: 120,
      locationType: 'Onsite',
      location: 'GCC Chapel, San Pablo City',
      ldpAssignments: [],
      createdBy,
    });
    createdEvents.push(onsiteEvent);

    // Online service same day, different time
    const onlineSunday = new Date(sunday);
    onlineSunday.setHours(14, 0, 0, 0);

    const onlineEvent = await Event.create({
      title: `[Sample] Worship Service (Online) — ${sunday.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`,
      eventType: etOnline._id,
      teacher: teacherRef,
      ministers: [],
      scheduledAt: onlineSunday,
      durationMinutes: 90,
      locationType: 'Online',
      link: 'https://zoom.us/j/sample',
      ldpAssignments: [],
      createdBy,
    });
    createdEvents.push(onlineEvent);
  }
  console.log(`[Seed] ✓ ${createdEvents.length} sample events created.`);

  // =========================================================================
  // 4. CREATE OUTREACH + SESSIONS
  // =========================================================================
  console.log('[Seed] Creating sample outreach & sessions...');

  let outreach = await Outreach.findOne({ name: '[Sample] Brgy. San Lucas Outreach' });
  if (!outreach) {
    outreach = await Outreach.create({
      name: '[Sample] Brgy. San Lucas Outreach',
      barangay: 'San Lucas',
      city: 'San Pablo City',
      address: 'Purok 3, Brgy. San Lucas',
      description: 'Community outreach and Bible study in Brgy. San Lucas.',
      teacher: teacherRef,
      ministers: [],
      isActive: true,
      createdBy,
    });
  }

  const createdSessions = [];
  for (let week = 0; week < 4; week++) {
    const scheduledAt = daysBefore(week * 7 + 6); // Saturdays
    scheduledAt.setHours(15, 0, 0, 0);

    const session = await OutreachSession.create({
      outreach: outreach._id,
      title: `[Sample] Outreach Session — Week ${4 - week}`,
      teacher: teacherRef,
      ministers: [],
      scheduledAt,
      durationMinutes: 90,
      location: 'Purok 3, Brgy. San Lucas',
      createdBy,
    });
    createdSessions.push(session);
  }
  console.log(`[Seed] ✓ ${createdSessions.length} outreach sessions created.`);

  // =========================================================================
  // 5. CREATE ATTENDANCE RECORDS
  // =========================================================================
  console.log('[Seed] Creating attendance records...');

  const VISITOR_NAMES = [
    'Angelo Reyes', 'Jasmine Santos', 'Rico Villanueva', 'Mylene Cruz',
    'Ariel Domingo', 'Cherry Bautista', 'Edwin Ramos', 'Rosalie Mendoza',
    'Francis Garcia', 'Diana Flores', 'Kenneth Torres', 'Lovely Castillo',
  ];

  let attendanceCount = 0;

  // Helper to create attendance for a target
  const createAttendance = async (kind, target, attendeeCount, visitorCount = 0) => {
    const selectedMembers = pickN(members, attendeeCount);
    const ops = [];

    for (const mem of selectedMembers) {
      ops.push({
        insertOne: {
          document: {
            target: { kind, ref: target._id },
            member: mem._id,
            markedBy: createdBy,
            markedAt: target.scheduledAt,
            enteredAt: new Date(target.scheduledAt.getTime() + Math.floor(Math.random() * 15) * 60000),
          },
        },
      });
    }

    for (let v = 0; v < visitorCount; v++) {
      ops.push({
        insertOne: {
          document: {
            target: { kind, ref: target._id },
            visitorName: pick(VISITOR_NAMES),
            markedBy: createdBy,
            markedAt: target.scheduledAt,
          },
        },
      });
    }

    if (ops.length > 0) {
      try {
        const result = await Attendance.bulkWrite(ops, { ordered: false });
        attendanceCount += result.insertedCount;
      } catch (err) {
        // Duplicate key errors from re-runs — count the successful ones
        if (err.insertedCount) attendanceCount += err.insertedCount;
      }
    }
  };

  // Meetings: 15-40 members each, 1-3 visitors
  for (const meeting of createdMeetings) {
    const count = 15 + Math.floor(Math.random() * 26); // 15–40
    const visitors = Math.floor(Math.random() * 4); // 0–3
    await createAttendance('Meeting', meeting, count, visitors);
  }

  // Events (Worship Services): 30-60 members each, 2-5 visitors
  for (const event of createdEvents) {
    const count = 30 + Math.floor(Math.random() * 31); // 30–60
    const visitors = 2 + Math.floor(Math.random() * 4); // 2–5
    await createAttendance('Event', event, count, visitors);
  }

  // Outreach sessions: 5-15 members, 3-8 visitors
  for (const session of createdSessions) {
    const count = 5 + Math.floor(Math.random() * 11); // 5–15
    const visitors = 3 + Math.floor(Math.random() * 6); // 3–8
    await createAttendance('OutreachSession', session, count, visitors);
  }

  console.log(`[Seed] ✓ ${attendanceCount} attendance records created.`);

  // =========================================================================
  // DONE
  // =========================================================================
  console.log('\n[Seed] ✅ Sample data seeding complete!');
  console.log(`  • ${createdMeetings.length} meetings (past 6 weeks)`);
  console.log(`  • ${createdEvents.length} events (past 6 Sundays)`);
  console.log(`  • 1 outreach + ${createdSessions.length} sessions`);
  console.log(`  • ${attendanceCount} attendance records`);
  console.log(`  • Married members patched with wedding dates (birthdates untouched — from Google Sheet)`);

  process.exit(0);
};

run().catch((err) => {
  console.error('[Seed] Fatal error:', err);
  process.exit(1);
});
