const mongoose = require('mongoose');

/**
 * A "Life Development Progress" dimension. Each member can hold one
 * selected option per category (see Member.ldp).
 *
 * Example:
 *   name:    "Worship Service"
 *   options: ["Regularly Attending (Onsite)", "Regularly Attending (Online)",
 *             "Regularly Attending (Both)", "Irregularly Attending", "Visitor"]
 */
const ldpOptionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 100 },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * One row of the auto-recompute rule table.
 * Walking thresholds sorted by minCount DESC, the first row whose minCount
 * is <= the member's attendance count "wins" — its optionLabel is saved.
 *
 * Set minCount: 0 for a catch-all (e.g. "Visitor" / "Not Yet").
 */
const ldpThresholdSchema = new mongoose.Schema(
  {
    optionLabel: { type: String, required: true, trim: true },
    minCount:    { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ldpCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: 80,
      unique: true,
    },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    // 'select' = pick one of `options`; 'text' = freeform note (options ignored)
    type: { type: String, enum: ['select', 'text'], default: 'select' },
    options: {
      type: [ldpOptionSchema],
      validate: {
        validator: function (arr) {
          if (this.type === 'text') return true;
          return Array.isArray(arr) && arr.length > 0;
        },
        message: 'A select category must have at least one option',
      },
    },

    // --- Auto-recompute from attendance ---
    // 'manual'     → staff picks the value themselves
    // 'attendance' → recomputed from the member's attendance count
    //                against linkedMeetingTypes/linkedEventTypes in a
    //                rolling windowDays window, bucketed by thresholds.
    autoMode: { type: String, enum: ['manual', 'attendance'], default: 'manual' },
    linkedMeetingTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MeetingType' }],
    linkedEventTypes:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'EventType' }],
    windowDays: { type: Number, default: 56, min: 1, max: 3650 },
    thresholds: [ldpThresholdSchema],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ldpCategorySchema.index({ order: 1, name: 1 });

module.exports = mongoose.model('LdpCategory', ldpCategorySchema);
