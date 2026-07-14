const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getActivity } = require('../controllers/activityController');

router.get('/', auth, getActivity);

module.exports = router;
