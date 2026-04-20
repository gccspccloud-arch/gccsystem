const { Router } = require('express');
const ctrl = require('../controllers/outreachAttendeeController');
const { createRules, updateRules } = require('../validators/outreachAttendeeValidator');
const validate = require('../middleware/validate');
const { authorize } = require('../middleware/auth');

const router = Router();

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', authorize('super_admin', 'admin'), createRules, validate, ctrl.create);
router.patch('/:id', authorize('super_admin', 'admin'), updateRules, validate, ctrl.update);
router.delete('/:id', authorize('super_admin', 'admin'), ctrl.remove);
router.post('/:id/promote', authorize('super_admin', 'admin'), ctrl.promoteToMember);

module.exports = router;
