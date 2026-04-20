const { body } = require('express-validator');

const createRules = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('body').trim().notEmpty().withMessage('Content is required').isLength({ max: 5000 }),
  body('isPublished').optional().isBoolean().toBoolean(),
  body('isPinned').optional().isBoolean().toBoolean(),
];

const updateRules = [
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('body').optional().trim().notEmpty().isLength({ max: 5000 }),
  body('isPublished').optional().isBoolean().toBoolean(),
  body('isPinned').optional().isBoolean().toBoolean(),
];

module.exports = { createRules, updateRules };
