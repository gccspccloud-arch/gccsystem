/**
 * Wires up the LDP categories to the LDP-aligned Meeting/Event Types.
 * Sets autoMode='attendance' + linked types + windowDays + thresholds
 * for the categories that map cleanly onto attendance counts. The rest
 * are reset to manual (in case a previous run wired them).
 *
 * Idempotent — safe to re-run anytime.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const LdpCategory = require('../models/LdpCategory');
const MeetingType = require('../models/MeetingType');
const EventType = require('../models/EventType');

const WIRINGS = [
  // Worship Service — Auto mode is unused here (no thresholds); but linking
  // the two event types lets the New Event form expose the LDP dropdown so
  // staff can pick the right "Regularly Attending (Onsite/Online)" value
  // per service. "Both", "Irregularly", "Visitor" stay manual overrides.
  {
    category: 'Worship Service',
    autoMode: 'attendance', // enables the link to surface in the event form
    windowDays: 56,
    meetingTypeNames: [],
    eventTypeNames: ['Worship Service (Onsite)', 'Worship Service (Online)'],
    thresholds: [], // no count-based rules — direct assignment per event
  },
  {
    category: 'Prayer Meeting',
    autoMode: 'attendance',
    windowDays: 56,
    meetingTypeNames: ['Prayer Meeting'],
    eventTypeNames: [],
    thresholds: [
      { optionLabel: 'Regularly Attending',   minCount: 6 },
      { optionLabel: 'Irregularly Attending', minCount: 1 },
      { optionLabel: 'Not Yet Attending',     minCount: 0 },
    ],
  },
  {
    category: 'Prayer Watch',
    autoMode: 'attendance',
    windowDays: 56,
    meetingTypeNames: ['Prayer Watch'],
    eventTypeNames: [],
    thresholds: [
      { optionLabel: 'Participating',     minCount: 4 },
      { optionLabel: 'Inconsistent',      minCount: 1 },
      { optionLabel: 'Not Participating', minCount: 0 },
    ],
  },
];

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const lookupTypes = async (Model, names) => {
  if (!names.length) return [];
  const docs = await Model.find({
    name: { $in: names.map((n) => new RegExp(`^${escapeRx(n)}$`, 'i')) },
  });
  const found = docs.map((d) => d.name);
  const missing = names.filter((n) => !found.some((f) => f.toLowerCase() === n.toLowerCase()));
  if (missing.length) {
    console.warn(`  ⚠ Missing types (skipped link): ${missing.join(', ')}`);
  }
  return docs.map((d) => d._id);
};

const seed = async () => {
  await connectDB();

  // Reset every category to manual first — clean slate.
  await LdpCategory.updateMany({}, {
    $set: {
      autoMode: 'manual',
      linkedMeetingTypes: [],
      linkedEventTypes: [],
      thresholds: [],
    },
  });
  console.log('[Seed] Reset all LDP categories to manual.');

  let wired = 0;
  let skipped = 0;
  for (const w of WIRINGS) {
    const cat = await LdpCategory.findOne({ name: new RegExp(`^${w.category}$`, 'i') });
    if (!cat) {
      console.warn(`  ⚠ LDP category "${w.category}" not found — skipped.`);
      skipped += 1;
      continue;
    }

    const meetingTypeIds = await lookupTypes(MeetingType, w.meetingTypeNames);
    const eventTypeIds = await lookupTypes(EventType, w.eventTypeNames);

    if (meetingTypeIds.length === 0 && eventTypeIds.length === 0) {
      console.warn(`  ⚠ No linked types resolved for "${w.category}" — left manual.`);
      skipped += 1;
      continue;
    }

    // Validate thresholds reference real options on the category (if any).
    const validLabels = new Set((cat.options || []).map((o) => o.label));
    const badThreshold = (w.thresholds || []).find((t) => !validLabels.has(t.optionLabel));
    if (badThreshold) {
      console.warn(`  ⚠ "${w.category}" has no option "${badThreshold.optionLabel}" — skipped.`);
      skipped += 1;
      continue;
    }

    cat.autoMode = w.autoMode;
    cat.linkedMeetingTypes = meetingTypeIds;
    cat.linkedEventTypes = eventTypeIds;
    cat.windowDays = w.windowDays;
    cat.thresholds = w.thresholds;
    await cat.save();
    console.log(`  ✓ Wired "${w.category}" → ${w.meetingTypeNames.join(', ')} (${w.thresholds.length} thresholds)`);
    wired += 1;
  }

  console.log(`\n[Seed] LDP wiring — wired: ${wired}, skipped: ${skipped}`);
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('[Seed] Failed:', err.message);
  process.exit(1);
});
