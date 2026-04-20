const mongoose = require('mongoose');

const eventTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Type name is required'],
      trim: true,
      maxlength: 80,
      unique: true,
    },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EventType', eventTypeSchema);
