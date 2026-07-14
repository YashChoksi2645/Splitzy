const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getDashboardSummary, getAllExpensesForUser,
  searchUsers, updateProfile, changePassword
} = require('../controllers/userController');

router.get('/dashboard-summary', auth, getDashboardSummary);
router.get('/all-expenses', auth, getAllExpensesForUser);
router.get('/search', auth, searchUsers);
router.put('/me', auth, updateProfile);
router.put('/me/password', auth, changePassword);

module.exports = router;
