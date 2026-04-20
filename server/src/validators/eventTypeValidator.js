const { body } = require('express-validator');

const createRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 300 }),
  body('isActive').optional().isBoolean().toBoolean(),
];

const updateRules = [
  body('name').optional().trim().notEmpty().isLength({ max: 80 }),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 300 }),
  body('isActive').optional().isBoolean().toBoolean(),
];

module.exports = { createRules, updateRules };
