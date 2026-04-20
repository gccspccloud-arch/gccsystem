const { Router } = require('express');
const {
  createMember,
  getMembers,
  getMemberById,
  updateMember,
  deleteMember,
} = require('../controllers/memberController');
const { createMemberRules, updateMemberRules } = require('../validators/memberValidator');
const validate = require('../middleware/validate');
const { authorize } = require('../middleware/auth');

const router = Router();

router
  .route('/')
  .get(getMembers)
  .post(authorize('super_admin', 'admin'), createMemberRules, validate, createMember);

router
  .route('/:id')
  .get(getMemberById)
  .patch(authorize('super_admin', 'admin'), updateMemberRules, validate, updateMember)
  .delete(authorize('super_admin'), deleteMember);

module.exports = router;
