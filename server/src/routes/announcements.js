const { Router } = require('express');
const ctrl = require('../controllers/announcementController');
const { createRules, updateRules } = require('../validators/announcementValidator');
const validate = require('../middleware/validate');
const { authorize } = require('../middleware/auth');

const router = Router();

router.get('/', ctrl.list);
router.get('/all', authorize('super_admin', 'admin'), ctrl.listAll);
router.post('/', authorize('super_admin', 'admin'), createRules, validate, ctrl.create);
router.patch('/:id', authorize('super_admin', 'admin'), updateRules, validate, ctrl.update);
router.delete('/:id', authorize('super_admin', 'admin'), ctrl.remove);

module.exports = router;
