const mongoose = require('mongoose');

const TARGET_KINDS = ['Meeting', 'Event', 'OutreachSession'];

const attendanceSchema = new mongoose.Schema(
  {
    target: {
      kind: { type: String, enum: TARGET_KINDS, required: true },
      ref: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'target.kind',
      },
    },
    // Either member OR visitorName must be set (enforced by validator + controller)
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
    visitorName: { type: String, trim: true, default: '' },
    // Lightweight visitor info to enable later promotion to a Member.
    visitorAddress: { type: String, trim: true, default: '' },
    visitorContactNumber: { type: String, trim: true, default: '' },

    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    markedAt: { type: Date, default: Date.now },
    // Optional time the person actually arrived. Distinct from markedAt
    // (which is when staff ticked the box).
    enteredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Prevent the same member from being recorded twice for the same target.
// Sparse so visitor-only records (member: null) don't collide.
attendanceSchema.index(
  { 'target.kind': 1, 'target.ref': 1, member: 1 },
  { unique: true, partialFilterExpression: { member: { $type: 'objectId' } } }
);

// Fast lookup by target
attendanceSchema.index({ 'target.kind': 1, 'target.ref': 1 });
// Fast lookup by member (history)
attendanceSchema.index({ member: 1, markedAt: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
module.exports.TARGET_KINDS = TARGET_KINDS;
