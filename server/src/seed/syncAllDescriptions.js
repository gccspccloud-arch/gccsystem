/**
 * One-shot: align descriptions across MeetingType / EventType / LdpCategory
 * by name. For each unique (case-insensitive) name, pick the most recently
 * updated description and propagate to the matching records in all three
 * collections. Useful right after introducing the auto-sync feature.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const MeetingType = require('../models/MeetingType');
const EventType = require('../models/EventType');
const LdpCategory = require('../models/LdpCategory');

const escapeRx = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const run = async () => {
  await connectDB();

  const all = [
    ...(await MeetingType.find().select('_id name description updatedAt')).map((x) => ({ col: 'MT', ...x.toObject() })),
    ...(await EventType.find().select('_id name description updatedAt')).map((x) => ({ col: 'ET', ...x.toObject() })),
    ...(await LdpCategory.find().select('_id name description updatedAt')).map((x) => ({ col: 'LC', ...x.toObject() })),
  ];

  const winnerByName = {};
  for (const r of all) {
    const k = (r.name || '').toLowerCase();
    if (!k) continue;
    if (!winnerByName[k] || new Date(r.updatedAt) > new Date(winnerByName[k].updatedAt)) {
      winnerByName[k] = r;
    }
  }

  let touched = 0;
  for (const winner of Object.values(winnerByName)) {
    const rx = new RegExp(`^${escapeRx(winner.name)}$`, 'i');
    const desc = winner.description || '';
    const a = await MeetingType.updateMany({ name: rx }, { $set: { description: desc } });
    const b = await EventType.updateMany({ name: rx }, { $set: { description: desc } });
    const c = await LdpCategory.updateMany({ name: rx }, { $set: { description: desc } });
    touched += (a.modifiedCount || 0) + (b.modifiedCount || 0) + (c.modifiedCount || 0);
    console.log(`  "${winner.name}" (${winner.col}-winner) → MT:${a.modifiedCount} ET:${b.modifiedCount} LC:${c.modifiedCount}`);
  }

  console.log(`\n[Sync] Done. Records touched: ${touched}`);
  await mongoose.disconnect();
};

run().catch((err) => { console.error('[Sync] Failed:', err.message); process.exit(1); });
