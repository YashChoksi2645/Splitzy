const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  sendFriendRequest, acceptFriendRequest, rejectFriendRequest,
  getPendingRequests, getFriends, getFriendDetail
} = require('../controllers/friendController');

router.post('/request', auth, sendFriendRequest);
router.post('/:friendshipId/accept', auth, acceptFriendRequest);
router.post('/:friendshipId/reject', auth, rejectFriendRequest);
router.get('/requests', auth, getPendingRequests);
router.get('/', auth, getFriends);
router.get('/:id', auth, getFriendDetail);

module.exports = router;
