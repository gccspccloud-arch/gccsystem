const { Router } = require('express');
const ctrl = require('../controllers/reportController');
const { authorize } = require('../middleware/auth');

const router = Router();

// Dashboard + celebrants are visible to anyone authenticated.
router.get('/dashboard', ctrl.dashboard);
router.get('/celebrants', ctrl.celebrants);

// Detailed reports are admin-only.
router.get('/attendance', authorize('super_admin', 'admin'), ctrl.attendanceReport);
router.get('/member-attendance-summary', authorize('super_admin', 'admin'), ctrl.memberAttendanceSummary);
router.get('/outreach', authorize('super_admin', 'admin'), ctrl.outreachReport);

module.exports = router;
