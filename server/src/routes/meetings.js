const { Router } = require('express');
const ctrl = require('../controllers/meetingController');
const { createRules, updateRules } = require('../validators/meetingValidator');
const validate = require('../middleware/validate');

const router = Router();

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', createRules, validate, ctrl.create);
router.patch('/:id', updateRules, validate, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
