const { Router } = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const memberRoutes = require('./members');
const announcementRoutes = require('./announcements');
const eventRoutes = require('./events');
const eventTypeRoutes = require('./eventTypes');
const meetingTypeRoutes = require('./meetingTypes');
const meetingRoutes = require('./meetings');
const attendanceRoutes = require('./attendance');
const reportRoutes = require('./reports');
const outreachRoutes = require('./outreach');
const outreachAttendeeRoutes = require('./outreachAttendees');
const outreachSessionRoutes = require('./outreachSessions');
const { protect } = require('../middleware/auth');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'GCC API is running', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/members', protect, memberRoutes);
router.use('/announcements', protect, announcementRoutes);
router.use('/events', protect, eventRoutes);
router.use('/event-types', protect, eventTypeRoutes);
router.use('/meeting-types', protect, meetingTypeRoutes);
router.use('/meetings', protect, meetingRoutes);
router.use('/attendance', protect, attendanceRoutes);
router.use('/reports', protect, reportRoutes);
router.use('/outreach', protect, outreachRoutes);
router.use('/outreach-attendees', protect, outreachAttendeeRoutes);
router.use('/outreach-sessions', protect, outreachSessionRoutes);

module.exports = router;
