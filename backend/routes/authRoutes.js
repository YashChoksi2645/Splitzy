const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { register, login, me, sendSignupOtp, verifySignupOtp } = require('../controllers/authController');

router.post('/register', register); // legacy/direct - not used by the signup UI anymore
router.post('/send-otp', sendSignupOtp);
router.post('/verify-otp', verifySignupOtp);
router.post('/login', login);
router.get('/me', auth, me);

module.exports = router;
