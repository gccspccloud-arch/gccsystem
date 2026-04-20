const mongoose = require('mongoose');

/**
 * A long-running satellite ministry at a specific location. People who
 * attend are stored in OutreachAttendee (separate from Members). Each
 * scheduled gathering is an OutreachSession where attendance is taken.
 */
const outreachSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 200 },
    barangay: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },

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

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

outreachSchema.index({ name: 1 });

module.exports = mongoose.model('Outreach', outreachSchema);
