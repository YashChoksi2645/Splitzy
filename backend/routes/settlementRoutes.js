const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createSettlement, getSettlements } = require('../controllers/settlementController');

router.post('/', auth, createSettlement);
router.get('/', auth, getSettlements);

module.exports = router;
