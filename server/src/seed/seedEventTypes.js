require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const EventType = require('../models/EventType');

const DEFAULTS = [
  { name: 'Sunday Service', description: 'Weekly Sunday worship service.' },
  { name: 'Prayer Gathering', description: 'Church-wide prayer meeting.' },
  { name: 'Outreach Event', description: 'Community outreach activities.' },
  { name: 'Conference', description: 'Conferences, retreats, summits.' },
  { name: 'Fellowship', description: 'Whole-church fellowship gatherings.' },
  { name: 'Other', description: 'Other large gatherings.' },
];

const seed = async () => {
  await connectDB();
  let created = 0;
  let skipped = 0;
  for (const t of DEFAULTS) {
    const existing = await EventType.findOne({ name: new RegExp(`^${t.name}$`, 'i') });
    if (existing) { skipped += 1; continue; }
    await EventType.create(t);
    created += 1;
  }
  console.log(`[Seed] Event types — created: ${created}, already existed: ${skipped}`);
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('[Seed] Failed:', err.message);
  process.exit(1);
});
