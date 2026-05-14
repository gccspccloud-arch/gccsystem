require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const LdpCategory = require('../models/LdpCategory');

const DEFAULTS = [
  {
    name: 'DG/LH',
    description: 'Discipleship Group / Life Huddle involvement.',
    order: 20,
    options: [
      { label: 'DG',   order: 10 },
      { label: 'LH',   order: 20 },
      { label: 'None', order: 30 },
    ],
  },
  {
    name: 'Worship Service',
    description: 'How regularly the member attends Sunday worship.',
    order: 30,
    options: [
      { label: 'Regularly Attending (Onsite)', order: 10 },
      { label: 'Regularly Attending (Online)', order: 20 },
      { label: 'Regularly Attending (Both)',   order: 30 },
      { label: 'Irregularly Attending',        order: 40 },
      { label: 'Visitor',                      order: 50 },
    ],
  },
  {
    name: 'Prayer Meeting',
    description: 'Prayer meeting attendance pattern.',
    order: 40,
    options: [
      { label: 'Regularly Attending',   order: 10 },
      { label: 'Irregularly Attending', order: 20 },
      { label: 'Not Yet Attending',     order: 30 },
    ],
  },
  {
    name: 'Family Altar',
    description: 'Personal/family devotion practice.',
    order: 50,
    options: [
      { label: 'Regular',   order: 10 },
      { label: 'Irregular', order: 20 },
      { label: 'Not Yet',   order: 30 },
    ],
  },
  {
    name: 'Prayer Watch',
    description: 'Participation in scheduled prayer watches.',
    order: 60,
    options: [
      { label: 'Participating',    order: 10 },
      { label: 'Inconsistent',     order: 20 },
      { label: 'Not Participating', order: 30 },
    ],
  },
  // Progress-style categories (same option set as the overall Progress column).
  {
    name: 'PDL',
    description: 'Personal Discipleship & Leadership track.',
    order: 70,
    options: [
      { label: 'Completed',  order: 10 },
      { label: 'For Review', order: 20 },
      { label: 'Ongoing',    order: 30 },
      { label: 'Incomplete', order: 40 },
    ],
  },
  {
    name: 'Tuklasin 1',
    description: 'Tuklasin level 1.',
    order: 80,
    options: [
      { label: 'Completed',  order: 10 },
      { label: 'For Review', order: 20 },
      { label: 'Ongoing',    order: 30 },
      { label: 'Incomplete', order: 40 },
    ],
  },
  {
    name: 'Tuklasin 2',
    description: 'Tuklasin level 2.',
    order: 90,
    options: [
      { label: 'Completed',  order: 10 },
      { label: 'For Review', order: 20 },
      { label: 'Ongoing',    order: 30 },
      { label: 'Incomplete', order: 40 },
    ],
  },
  {
    name: 'Tuklasin 3',
    description: 'Tuklasin level 3.',
    order: 100,
    options: [
      { label: 'Completed',  order: 10 },
      { label: 'For Review', order: 20 },
      { label: 'Ongoing',    order: 30 },
      { label: 'Incomplete', order: 40 },
    ],
  },
  {
    name: 'LEAD',
    description: 'LEAD program standing.',
    order: 110,
    options: [
      { label: 'Completed',  order: 10 },
      { label: 'For Review', order: 20 },
      { label: 'Ongoing',    order: 30 },
      { label: 'Incomplete', order: 40 },
    ],
  },
  // Free-form notes column.
  {
    name: 'Remarks',
    description: 'Free-text notes about this member\'s LDP standing.',
    order: 120,
    type: 'text',
    options: [],
  },
];

const seed = async () => {
  await connectDB();
  let created = 0;
  let skipped = 0;
  for (const c of DEFAULTS) {
    const existing = await LdpCategory.findOne({ name: new RegExp(`^${c.name}$`, 'i') });
    if (existing) {
      skipped += 1;
      continue;
    }
    await LdpCategory.create(c);
    created += 1;
  }
  console.log(`[Seed] LDP categories — created: ${created}, already existed: ${skipped}`);
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('[Seed] Failed:', err.message);
  process.exit(1);
});
