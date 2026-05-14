const { body } = require('express-validator');

const optionsRule = (chain) =>
  chain
    .isArray({ min: 1 }).withMessage('At least one option is required')
    .bail()
    .custom((arr) => {
      const labels = arr.map((o) => (o?.label || '').trim().toLowerCase());
      if (labels.some((l) => !l)) throw new Error('Each option must have a label');
      const set = new Set(labels);
      if (set.size !== labels.length) throw new Error('Option labels must be unique within a category');
      return true;
    });

const autoRules = (chain) =>
  chain.custom((arr, { req }) => {
    if (req.body.autoMode !== 'attendance') return true;
    if (!Array.isArray(arr) || arr.length < 1) {
      throw new Error('Auto-mode categories need at least one threshold row');
    }
    const seen = new Set();
    for (const t of arr) {
      if (!t || typeof t.optionLabel !== 'string' || !t.optionLabel.trim()) {
        throw new Error('Each threshold needs an optionLabel');
      }
      if (typeof t.minCount !== 'number' || t.minCount < 0) {
        throw new Error('Each threshold needs a minCount >= 0');
      }
      if (seen.has(t.optionLabel)) {
        throw new Error(`Duplicate threshold for option "${t.optionLabel}"`);
      }
      seen.add(t.optionLabel);
    }
    return true;
  });

const sharedAutoFields = [
  body('autoMode').optional().isIn(['manual', 'attendance']),
  body('linkedMeetingTypes').optional().isArray(),
  body('linkedEventTypes').optional().isArray(),
  body('windowDays').optional().isInt({ min: 1, max: 3650 }).toInt(),
  autoRules(body('thresholds').optional()),
];

const createRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 300 }),
  body('order').optional().isInt().toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('type').optional().isIn(['select', 'text']),
  body('options').custom((arr, { req }) => {
    if ((req.body.type || 'select') === 'text') return true;
    if (!Array.isArray(arr) || arr.length < 1) throw new Error('At least one option is required');
    const labels = arr.map((o) => (o?.label || '').trim().toLowerCase());
    if (labels.some((l) => !l)) throw new Error('Each option must have a label');
    if (new Set(labels).size !== labels.length) throw new Error('Option labels must be unique within a category');
    return true;
  }),
  ...sharedAutoFields,
];

const updateRules = [
  body('name').optional().trim().notEmpty().isLength({ max: 80 }),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 300 }),
  body('order').optional().isInt().toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('type').optional().isIn(['select', 'text']),
  body('options').optional().custom((arr, { req }) => {
    if ((req.body.type || 'select') === 'text') return true;
    if (!Array.isArray(arr) || arr.length < 1) throw new Error('At least one option is required');
    const labels = arr.map((o) => (o?.label || '').trim().toLowerCase());
    if (labels.some((l) => !l)) throw new Error('Each option must have a label');
    if (new Set(labels).size !== labels.length) throw new Error('Option labels must be unique within a category');
    return true;
  }),
  ...sharedAutoFields,
];

module.exports = { createRules, updateRules };
