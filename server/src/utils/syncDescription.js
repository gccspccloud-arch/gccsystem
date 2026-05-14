/**
 * Best-effort description sync across MeetingType / EventType / LdpCategory
 * by case-insensitive name match. Lets staff edit "PDL"'s description in
 * any of the three management screens and have it propagate to the others.
 *
 * Only the `description` field is mirrored — not the name. Renames are
 * intentionally not synced because they'd break unrelated records that
 * happen to share a new name.
 */
const MeetingType = require('../models/MeetingType');
const EventType = require('../models/EventType');
const LdpCategory = require('../models/LdpCategory');

const escapeRx = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const syncDescriptionByName = async ({ name, description, exclude }) => {
  if (!name) return;
  const rx = new RegExp(`^${escapeRx(name)}$`, 'i');
  const filter = { name: rx };
  const update = { $set: { description: description || '' } };

  // exclude = { collection: 'MeetingType'|'EventType'|'LdpCategory', id: ObjectId }
  // Skip the record we just saved so we don't echo-update ourselves.
  const skip = exclude || {};

  const tasks = [];
  if (skip.collection !== 'MeetingType') {
    tasks.push(MeetingType.updateOne(filter, update));
  } else {
    tasks.push(MeetingType.updateOne({ ...filter, _id: { $ne: skip.id } }, update));
  }
  if (skip.collection !== 'EventType') {
    tasks.push(EventType.updateOne(filter, update));
  } else {
    tasks.push(EventType.updateOne({ ...filter, _id: { $ne: skip.id } }, update));
  }
  if (skip.collection !== 'LdpCategory') {
    tasks.push(LdpCategory.updateOne(filter, update));
  } else {
    tasks.push(LdpCategory.updateOne({ ...filter, _id: { $ne: skip.id } }, update));
  }

  // Don't await — fire-and-forget so the controller response stays snappy.
  // Errors are logged, not thrown.
  Promise.all(tasks).catch((err) => {
    console.error('[syncDescription] failed:', err.message);
  });
};

module.exports = { syncDescriptionByName };
