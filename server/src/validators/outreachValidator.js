const { body } = require('express-validator');

const baseRules = (optional = false) => {
  const opt = (chain) => (optional ? chain.optional() : chain);
  return [
    opt(body('name').trim().notEmpty().withMessage('Name is required')).isLength({ max: 200 }),
    body('barangay').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
    body('city').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
    body('address').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
    body('description').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),

    opt(body('teacher').notEmpty().withMessage('Teacher is required')).isObject(),
    opt(body('teacher.kind').isIn(['User', 'Member']).withMessage('Teacher kind must be User or Member')),
    opt(body('teacher.ref').isMongoId().withMessage('Invalid teacher id')),

    body('ministers').optional().isArray(),
    body('ministers.*.kind').optional().isIn(['User', 'Member']),
    body('ministers.*.ref').optional().isMongoId(),

    body('isActive').optional().isBoolean().toBoolean(),
  ];
};

module.exports = {
  createRules: baseRules(false),
  updateRules: baseRules(true),
};
