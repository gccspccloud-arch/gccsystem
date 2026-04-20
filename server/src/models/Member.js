const mongoose = require('mongoose');
const { calculateAge, getAgeClass } = require('../utils/age');

const GENDERS = ['Male', 'Female'];
const CIVIL_STATUSES = ['Single', 'Married', 'Widowed', 'Separated'];
const EDUCATIONAL_STATUSES = [
  'Elementary',
  'High School',
  'Senior High School',
  'Vocational',
  'College',
  'Postgraduate',
  'OSY',
  'N/A',
];
const EMPLOYMENT_STATUSES = [
  'Employed (Public)',
  'Employed (Private)',
  'Self-Employed',
  'Unemployed',
  'Student',
  'Retired',
  'None',
];
const MEMBER_STATUSES = ['New Attendee', 'Regular Attendee', 'Member'];

const memberSchema = new mongoose.Schema(
  {
    lastName: { type: String, required: [true, 'Last name is required'], trim: true },
    firstName: { type: String, required: [true, 'First name is required'], trim: true },
    middleName: { type: String, trim: true, default: '' },

    gender: { type: String, enum: GENDERS, required: true },
    birthdate: { type: Date, required: [true, 'Birthdate is required'] },

    educationalStatus: { type: String, enum: EDUCATIONAL_STATUSES, default: 'N/A' },
    civilStatus: { type: String, enum: CIVIL_STATUSES, required: true },

    dateOfMarriage: { type: Date, default: null },
    spouse: { type: String, trim: true, default: '' },

    contactNumber: {
      type: String,
      trim: true,
      match: [/^9\d{9}$/, 'Contact number must be a valid PH mobile (9XXXXXXXXX)'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
      default: '',
    },

    permanentAddress: { type: String, required: true, trim: true },
    presentAddress: { type: String, trim: true, default: '' },

    employmentStatus: { type: String, enum: EMPLOYMENT_STATUSES, default: 'None' },

    memberStatus: { type: String, enum: MEMBER_STATUSES, default: 'New Attendee', required: true },

    isBaptized: { type: Boolean, default: false },
    churchBaptized: { type: String, trim: true, default: '' },
    dateBaptized: { type: Date, default: null },

    dateJoinedChurch: { type: Date, default: null },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

memberSchema.virtual('fullName').get(function () {
  return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
});

memberSchema.virtual('age').get(function () {
  return calculateAge(this.birthdate);
});

memberSchema.virtual('ageClass').get(function () {
  return getAgeClass(calculateAge(this.birthdate));
});

memberSchema.index({ lastName: 1, firstName: 1 });

module.exports = mongoose.model('Member', memberSchema);
module.exports.GENDERS = GENDERS;
module.exports.CIVIL_STATUSES = CIVIL_STATUSES;
module.exports.EDUCATIONAL_STATUSES = EDUCATIONAL_STATUSES;
module.exports.EMPLOYMENT_STATUSES = EMPLOYMENT_STATUSES;
module.exports.MEMBER_STATUSES = MEMBER_STATUSES;
