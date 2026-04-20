const { body } = require('express-validator');
const { ROLES } = require('../models/User');

const createUserRules = [
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(ROLES).withMessage('Invalid role'),
  body('member').optional({ nullable: true }).isMongoId().withMessage('Invalid member id'),
];

const updateUserRules = [
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 8 }),
  body('role').optional().isIn(ROLES),
  body('isActive').optional().isBoolean(),
];

module.exports = { createUserRules, updateUserRules };
