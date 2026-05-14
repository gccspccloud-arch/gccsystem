/**
 * DESTRUCTIVE: wipes all EventType records and reseeds with the
 * LDP-aligned set. Will refuse if any Event records reference the
 * types being deleted. Pass FORCE_CLEAR_EVENTS=1 to also wipe Events.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const EventType = require('../models/EventType');
const Event = require('../models/Event');

const DEFAULTS = [
  { name: 'Worship Service (Onsite)', description: 'Sunday worship service — in-person attendance.' },
  { name: 'Worship Service (Online)', description: 'Sunday worship service — livestream / online attendance.' },
];

const seed = async () => {
  await connectDB();

  const eventsExist = await Event.countDocuments();
  if (eventsExist > 0 && process.env.FORCE_CLEAR_EVENTS !== '1') {
    console.error(`[Seed] Refusing to wipe EventType — ${eventsExist} Event(s) reference them.`);
    console.error('       Re-run with FORCE_CLEAR_EVENTS=1 to also delete all Events.');
    await mongoose.disconnect();
    process.exit(1);
  }

  if (eventsExist > 0) {
    const r = await Event.deleteMany({});
    console.log(`[Seed] Deleted ${r.deletedCount} existing Event(s).`);
  }

  const wipe = await EventType.deleteMany({});
  console.log(`[Seed] Deleted ${wipe.deletedCount} existing EventType(s).`);

  for (const t of DEFAULTS) {
    await EventType.create(t);
  }
  console.log(`[Seed] Event types — created: ${DEFAULTS.length}`);
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('[Seed] Failed:', err.message);
  process.exit(1);
});
