const { Router } = require('express');
const ctrl = require('../controllers/attendanceController');
const { toggleMemberRules, addVisitorRules } = require('../validators/attendanceValidator');
const validate = require('../middleware/validate');

const router = Router();

// Anyone authenticated can read attendance.
router.get('/', ctrl.list);
router.get('/by-member/:memberId', ctrl.byMember);

// Mutations: controller checks per-target authorization (teacher / minister / admin).
router.post('/toggle-member', toggleMemberRules, validate, ctrl.toggleMember);
router.post('/visitor', addVisitorRules, validate, ctrl.addVisitor);
router.post('/:id/promote', ctrl.promoteVisitor);
router.patch('/:id/time', ctrl.updateTime);
router.delete('/:id', ctrl.remove);

module.exports = router;
