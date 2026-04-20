const mongoose = require('mongoose');
const { calculateAge, getAgeClass } = require('../utils/age');

const GENDERS = ['Male', 'Female'];

/**
 * A lightweight person record tied to a specific Outreach. Distinct from
 * Member — these are outreach contacts who may later be promoted into the
 * main Members table (see promotedToMember).
 */
const outreachAttendeeSchema = new mongoose.Schema(
  {
    outreach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outreach',
      required: [true, 'Outreach is required'],
    },

    lastName: { type: String, required: [true, 'Last name is required'], trim: true },
    firstName: { type: String, required: [true, 'First name is required'], trim: true },
    middleName: { type: String, trim: true, default: '' },

    gender: { type: String, enum: GENDERS },
    birthdate: { type: Date, default: null },
    contactNumber: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },

    // If the attendee has been promoted to a full Member, we keep the link so
    // attendance history still points at the right person.
    promotedToMember: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

outreachAttendeeSchema.virtual('fullName').get(function () {
  return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
});
outreachAttendeeSchema.virtual('age').get(function () {
  return calculateAge(this.birthdate);
});
outreachAttendeeSchema.virtual('ageClass').get(function () {
  return getAgeClass(calculateAge(this.birthdate));
});

outreachAttendeeSchema.index({ outreach: 1, lastName: 1, firstName: 1 });

module.exports = mongoose.model('OutreachAttendee', outreachAttendeeSchema);
module.exports.GENDERS = GENDERS;
