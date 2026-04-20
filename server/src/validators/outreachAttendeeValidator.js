const { body } = require('express-validator');

const baseRules = (optional = false) => {
  const opt = (chain) => (optional ? chain.optional() : chain);
  return [
    opt(body('outreach').notEmpty().withMessage('Outreach is required')).isMongoId(),
    opt(body('lastName').trim().notEmpty().withMessage('Last name is required')).isLength({ max: 100 }),
    opt(body('firstName').trim().notEmpty().withMessage('First name is required')).isLength({ max: 100 }),
    body('middleName').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('gender').optional({ checkFalsy: true }).isIn(['Male', 'Female']),
    body('birthdate').optional({ checkFalsy: true }).isISO8601().toDate(),
    body('contactNumber').optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
    body('address').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
    body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
  ];
};

module.exports = {
  createRules: baseRules(false),
  updateRules: baseRules(true),
};
