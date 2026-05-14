const { Router } = require('express');
const ctrl = require('../controllers/ldpCategoryController');
const { createRules, updateRules } = require('../validators/ldpCategoryValidator');
const validate = require('../middleware/validate');
const { authorize } = require('../middleware/auth');

const router = Router();

router.get('/', ctrl.list);
router.post('/', authorize('super_admin', 'admin'), createRules, validate, ctrl.create);
router.patch('/:id', authorize('super_admin', 'admin'), updateRules, validate, ctrl.update);
router.delete('/:id', authorize('super_admin', 'admin'), ctrl.remove);
router.post('/:id/rename-option', authorize('super_admin', 'admin'), ctrl.renameOption);

module.exports = router;
