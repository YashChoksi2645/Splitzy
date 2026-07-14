const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createExpense, getExpenseById, updateExpense, deleteExpense, getDirectExpenses
} = require('../controllers/expenseController');

router.post('/', auth, createExpense);
router.get('/direct/:friendId', auth, getDirectExpenses);
router.get('/:id', auth, getExpenseById);
router.put('/:id', auth, updateExpense);
router.delete('/:id', auth, deleteExpense);

module.exports = router;
