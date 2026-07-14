const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createGroup, getGroups, getGroupById, updateGroup,
  addMember, getGroupExpenses, getGroupBalances, leaveGroup
} = require('../controllers/groupController');

router.post('/', auth, createGroup);
router.get('/', auth, getGroups);
router.get('/:id', auth, getGroupById);
router.put('/:id', auth, updateGroup);
router.post('/:id/members', auth, addMember);
router.post('/:id/leave', auth, leaveGroup);
router.get('/:id/expenses', auth, getGroupExpenses);
router.get('/:id/balances', auth, getGroupBalances);

module.exports = router;
