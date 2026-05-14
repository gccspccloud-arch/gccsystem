/**
 * DESTRUCTIVE: wipes all MeetingType records and reseeds with the
 * LDP-aligned set. Will refuse if any Meeting records reference the
 * types being deleted (the unique-by-name index makes hot-swapping
 * unsafe otherwise). Pass FORCE_CLEAR_MEETINGS=1 to also wipe Meetings.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const MeetingType = require('../models/MeetingType');
const Meeting = require('../models/Meeting');

const DEFAULTS = [
  { name: 'DG',             description: 'Discipleship Group meeting.' },
  { name: 'LH',             description: 'Life Huddle meeting.' },
  { name: 'Prayer Meeting', description: 'Weekly prayer meeting.' },
  { name: 'Prayer Watch',   description: 'Scheduled prayer watch session.' },
  { name: 'PDL',            description: 'Personal Discipleship & Leadership session.' },
  { name: 'Tuklasin 1',     description: 'Tuklasin level 1 class.' },
  { name: 'Tuklasin 2',     description: 'Tuklasin level 2 class.' },
  { name: 'Tuklasin 3',     description: 'Tuklasin level 3 class.' },
  { name: 'LEAD',           description: 'LEAD program session.' },
];

const seed = async () => {
  await connectDB();

  const meetingsExist = await Meeting.countDocuments();
  if (meetingsExist > 0 && process.env.FORCE_CLEAR_MEETINGS !== '1') {
    console.error(`[Seed] Refusing to wipe MeetingType — ${meetingsExist} Meeting(s) reference them.`);
    console.error('       Re-run with FORCE_CLEAR_MEETINGS=1 to also delete all Meetings.');
    await mongoose.disconnect();
    process.exit(1);
  }

  if (meetingsExist > 0) {
    const r = await Meeting.deleteMany({});
    console.log(`[Seed] Deleted ${r.deletedCount} existing Meeting(s).`);
  }

  const wipe = await MeetingType.deleteMany({});
  console.log(`[Seed] Deleted ${wipe.deletedCount} existing MeetingType(s).`);

  for (const t of DEFAULTS) {
    await MeetingType.create(t);
  }
  console.log(`[Seed] Meeting types — created: ${DEFAULTS.length}`);
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('[Seed] Failed:', err.message);
  process.exit(1);
});
