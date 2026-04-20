const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 200 },
    meetingType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MeetingType',
      required: [true, 'Meeting type is required'],
    },
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
    locationType: {
      type: String,
      enum: ['Online', 'Onsite'],
      required: [true, 'Location type is required'],
      default: 'Onsite',
    },
    location: { type: String, trim: true, maxlength: 200, default: '' },
    link: { type: String, trim: true, maxlength: 500, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

meetingSchema.index({ scheduledAt: -1 });

module.exports = mongoose.model('Meeting', meetingSchema);
