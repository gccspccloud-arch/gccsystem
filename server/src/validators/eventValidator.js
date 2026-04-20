const { body } = require('express-validator');

const baseRules = (optional = false) => {
  const opt = (chain) => (optional ? chain.optional() : chain);
  return [
    opt(body('title').trim().notEmpty().withMessage('Title is required')).isLength({ max: 200 }),
    opt(body('eventType').notEmpty().withMessage('Event type is required')).isMongoId(),

    // Teacher (single, polymorphic)
    opt(body('teacher').notEmpty().withMessage('Teacher is required')).isObject(),
    opt(body('teacher.kind').isIn(['User', 'Member']).withMessage('Teacher kind must be User or Member')),
    opt(body('teacher.ref').isMongoId().withMessage('Invalid teacher id')),

    // Ministers (array, polymorphic, optional)
    body('ministers').optional().isArray(),
    body('ministers.*.kind').optional().isIn(['User', 'Member']).withMessage('Minister kind must be User or Member'),
    body('ministers.*.ref').optional().isMongoId().withMessage('Invalid minister id'),

    opt(body('scheduledAt').notEmpty().withMessage('Scheduled date is required')).isISO8601().toDate(),
    body('durationMinutes').optional().isInt({ min: 0, max: 1440 }).toInt(),
    body('agenda').optional({ checkFalsy: true }).trim().isLength({ max: 5000 }),
    body('link').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
    opt(body('locationType').notEmpty().withMessage('Location type is required'))
      .isIn(['Online', 'Onsite']).withMessage('Location type must be Online or Onsite'),
    body('location').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
    body().custom((value) => {
      if (value.locationType === 'Onsite' && !value.location?.trim()) {
        throw new Error('Exact location is required for onsite events');
      }
      return true;
    }),
  ];
};

module.exports = {
  createRules: baseRules(false),
  updateRules: baseRules(true),
};
