const { Router } = require('express');
const {
  createMember,
  getMembers,
  getMemberById,
  updateMember,
  deleteMember,
  updateMemberLdp,
  recomputeMemberLdpHandler,
  recomputeAllLdpHandler,
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

router.patch('/:id/ldp', authorize('super_admin', 'admin'), updateMemberLdp);
router.post('/:id/ldp/recompute', authorize('super_admin', 'admin'), recomputeMemberLdpHandler);
router.post('/ldp/recompute-all', authorize('super_admin', 'admin'), recomputeAllLdpHandler);

module.exports = router;
