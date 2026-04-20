const { body } = require('express-validator');
const {
  GENDERS,
  CIVIL_STATUSES,
  EDUCATIONAL_STATUSES,
  EMPLOYMENT_STATUSES,
  MEMBER_STATUSES,
} = require('../models/Member');

const createMemberRules = [
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('middleName').optional({ checkFalsy: true }).trim(),

  body('gender').isIn(GENDERS).withMessage('Invalid gender'),
  body('birthdate').isISO8601().withMessage('Invalid birthdate'),

  body('educationalStatus').optional({ checkFalsy: true }).isIn(EDUCATIONAL_STATUSES),
  body('civilStatus').isIn(CIVIL_STATUSES).withMessage('Invalid civil status'),

  body('dateOfMarriage').optional({ checkFalsy: true, nullable: true }).isISO8601(),
  body('spouse').optional({ checkFalsy: true }).trim(),

  body('contactNumber')
    .optional({ checkFalsy: true })
    .matches(/^9\d{9}$/)
    .withMessage('Contact number must be a valid PH mobile (9XXXXXXXXX)'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email').normalizeEmail(),

  body('permanentAddress').trim().notEmpty().withMessage('Permanent address is required'),
  body('presentAddress').optional({ checkFalsy: true }).trim(),

  body('employmentStatus').optional({ checkFalsy: true }).isIn(EMPLOYMENT_STATUSES),
  body('memberStatus').optional({ checkFalsy: true }).isIn(MEMBER_STATUSES),

  body('isBaptized').optional().isBoolean().toBoolean(),
  body('churchBaptized').optional({ checkFalsy: true }).trim(),
  body('dateBaptized').optional({ checkFalsy: true, nullable: true }).isISO8601(),

  body('dateJoinedChurch').optional({ checkFalsy: true, nullable: true }).isISO8601(),
  body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
];

const updateMemberRules = createMemberRules.map((rule) => rule.optional({ checkFalsy: true, nullable: true }));

module.exports = { createMemberRules, updateMemberRules };
