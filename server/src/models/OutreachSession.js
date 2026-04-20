const mongoose = require('mongoose');

/**
 * A scheduled gathering under a specific Outreach. Mirrors Meeting/Event
 * so attendance-taking (via the shared Attendance collection) works the
 * same way — target.kind = 'OutreachSession'.
 */
const outreachSessionSchema = new mongoose.Schema(
  {
    outreach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outreach',
      required: [true, 'Outreach is required'],
    },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 200 },

    // Teachers/ministers may differ per session; default to inherit from
    // Outreach on create if not supplied (controller handles that).
    teacher: {
      kind: { type: String, enum: ['User', 'Member'], required: [true, 'Teacher kind is required'] },
      ref: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Teacher is required'],
        refPath: 'teacher.kind',
      },
    },
    ministers: [
      {
        _id: false,
        kind: { type: String, enum: ['User', 'Member'], required: true },
        ref: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'ministers.kind' },
      },
    ],

    scheduledAt: { type: Date, required: [true, 'Scheduled date is required'] },
    durationMinutes: { type: Number, min: 0, max: 1440, default: 60 },
    agenda: { type: String, trim: true, maxlength: 5000, default: '' },
    location: { type: String, trim: true, maxlength: 200, default: '' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

outreachSessionSchema.index({ outreach: 1, scheduledAt: -1 });

module.exports = mongoose.model('OutreachSession', outreachSessionSchema);
