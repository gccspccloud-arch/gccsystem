const { Router } = require('express');
const { login, me } = require('../controllers/authController');
const { loginRules } = require('../validators/authValidator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const router = Router();

router.post('/login', loginRules, validate, login);
router.get('/me', protect, me);

module.exports = router;
