const { body } = require('express-validator');

const baseRules = (optional = false) => {
  const opt = (chain) => (optional ? chain.optional() : chain);
  return [
    opt(body('outreach').notEmpty().withMessage('Outreach is required')).isMongoId(),
    opt(body('title').trim().notEmpty().withMessage('Title is required')).isLength({ max: 200 }),

    body('teacher').optional().isObject(),
    body('teacher.kind').optional().isIn(['User', 'Member']),
    body('teacher.ref').optional().isMongoId(),
    body('ministers').optional().isArray(),
    body('ministers.*.kind').optional().isIn(['User', 'Member']),
    body('ministers.*.ref').optional().isMongoId(),

    opt(body('scheduledAt').notEmpty().withMessage('Scheduled date is required')).isISO8601().toDate(),
    body('durationMinutes').optional().isInt({ min: 0, max: 1440 }).toInt(),
    body('agenda').optional({ checkFalsy: true }).trim().isLength({ max: 5000 }),
    body('location').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
  ];
};

module.exports = {
  createRules: baseRules(false),
  updateRules: baseRules(true),
};
