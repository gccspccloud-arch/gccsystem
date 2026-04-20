const { Router } = require('express');
const {
  createUser,
  listUsers,
  updateUser,
  deleteUser,
  listAssignable,
  getByMember,
} = require('../controllers/userController');
const { createUserRules, updateUserRules } = require('../validators/userValidator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

const router = Router();

// Open to any authenticated user — used for picking a teacher/minister, etc.
router.get('/assignable', protect, listAssignable);

// Everything else: super_admin or admin
router.use(protect, authorize('super_admin', 'admin'));

router.get('/by-member/:memberId', getByMember);

router.route('/').get(listUsers).post(createUserRules, validate, createUser);
router.route('/:id').patch(updateUserRules, validate, updateUser).delete(deleteUser);

module.exports = router;
