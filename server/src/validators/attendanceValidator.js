const { body } = require('express-validator');

const TARGET_KINDS = ['Meeting', 'Event'];

const toggleMemberRules = [
  body('targetKind').isIn(TARGET_KINDS).withMessage('Invalid targetKind'),
  body('targetRef').isMongoId().withMessage('Invalid targetRef'),
  body('member').isMongoId().withMessage('Invalid member id'),
];

const addVisitorRules = [
  body('targetKind').isIn(TARGET_KINDS).withMessage('Invalid targetKind'),
  body('targetRef').isMongoId().withMessage('Invalid targetRef'),
  body('visitorName').trim().notEmpty().withMessage('Visitor name is required').isLength({ max: 120 }),
];

module.exports = { toggleMemberRules, addVisitorRules };
