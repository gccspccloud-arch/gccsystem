require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const MeetingType = require('../models/MeetingType');

const DEFAULTS = [
  { name: 'Discipleship', description: 'One-on-one or small group discipleship sessions.' },
  { name: 'Affinity', description: 'Affinity group gatherings.' },
  { name: 'Lighthouse', description: 'Lighthouse cell group meetings.' },
  { name: 'Outreach', description: 'Outreach and evangelism activities.' },
];

const seed = async () => {
  await connectDB();
  let created = 0;
  let skipped = 0;
  for (const t of DEFAULTS) {
    const existing = await MeetingType.findOne({ name: new RegExp(`^${t.name}$`, 'i') });
    if (existing) {
      skipped += 1;
      continue;
    }
    await MeetingType.create(t);
    created += 1;
  }
  console.log(`[Seed] Meeting types — created: ${created}, already existed: ${skipped}`);
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('[Seed] Failed:', err.message);
  process.exit(1);
});
