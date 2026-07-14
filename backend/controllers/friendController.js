const User = require('../models/User');
const Friendship = require('../models/Friendship');
const Notification = require('../models/Notification');
const Expense = require('../models/Expense');
const { computePairwiseBalance } = require('../utils/debtSimplify');

// POST /api/friends/request
// Sends a friend request. Two cases:
//  1. The email belongs to a REAL registered account -> creates a 'pending'
//     Friendship and a notification; the other person must accept it.
//  2. The email doesn't exist yet -> creates a lightweight placeholder account
//     and an already-'accepted' Friendship (mirrors a real product's "invite" flow:
//     there's no one to ask for acceptance yet, so the link becomes real once
//     they eventually sign up with that email).
exports.sendFriendRequest = async (req, res, next) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const me = await User.findById(req.userId);
    if (email.toLowerCase() === me.email) {
      return res.status(400).json({ message: "You can't add yourself as a friend" });
    }

    let friend = await User.findOne({ email: email.toLowerCase() });
    let isNewPlaceholder = false;

    if (!friend) {
      friend = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        password: 'PLACEHOLDER_NOT_LOGGED_IN',
        defaultCurrency: 'INR',
        isPlaceholder: true
      });
      isNewPlaceholder = true;
    }

    if (String(friend._id) === String(req.userId)) {
      return res.status(400).json({ message: "You can't add yourself as a friend" });
    }

    const [userA, userB] = [req.userId, String(friend._id)].sort();
    let friendship = await Friendship.findOne({ userA, userB });

    if (friendship) {
      if (friendship.status === 'rejected') {
        friendship.status = friend.isPlaceholder ? 'accepted' : 'pending';
        friendship.requestedBy = req.userId;
        await friendship.save();
      }
      return res.status(200).json({
        friend: { id: friend._id, name: friend.name, email: friend.email },
        status: friendship.status
      });
    }

    friendship = await Friendship.create({
      userA,
      userB,
      status: isNewPlaceholder ? 'accepted' : 'pending',
      requestedBy: req.userId
    });

    if (!isNewPlaceholder) {
      await Notification.create({
        userId: friend._id,
        type: 'friend_request',
        message: `${me.name} sent you a friend request`,
        relatedId: friendship._id
      });
    }

    res.status(201).json({
      friend: { id: friend._id, name: friend.name, email: friend.email },
      status: friendship.status
    });
  } catch (err) { next(err); }
};

// POST /api/friends/:friendshipId/accept
exports.acceptFriendRequest = async (req, res, next) => {
  try {
    const friendship = await Friendship.findById(req.params.friendshipId);
    if (!friendship) return res.status(404).json({ message: 'Request not found' });
    const isRecipient = String(friendship.userA) === String(req.userId) || String(friendship.userB) === String(req.userId);
    if (!isRecipient) return res.status(403).json({ message: 'Not authorized' });

    friendship.status = 'accepted';
    await friendship.save();
    res.json(friendship);
  } catch (err) { next(err); }
};

// POST /api/friends/:friendshipId/reject
exports.rejectFriendRequest = async (req, res, next) => {
  try {
    const friendship = await Friendship.findById(req.params.friendshipId);
    if (!friendship) return res.status(404).json({ message: 'Request not found' });
    friendship.status = 'rejected';
    await friendship.save();
    res.json(friendship);
  } catch (err) { next(err); }
};

// GET /api/friends/requests -> incoming pending requests (someone else requested me)
exports.getPendingRequests = async (req, res, next) => {
  try {
    const pending = await Friendship.find({
      status: 'pending',
      requestedBy: { $ne: req.userId },
      $or: [{ userA: req.userId }, { userB: req.userId }]
    });

    const results = await Promise.all(pending.map(async (f) => {
      const otherId = String(f.userA) === String(req.userId) ? f.userB : f.userA;
      const other = await User.findById(otherId).select('name email avatarColor');
      return { friendshipId: f._id, user: other };
    }));

    res.json(results);
  } catch (err) { next(err); }
};

// IMPORTANT: friends list only ever includes ACCEPTED friendships, and once
// accepted it is NEVER removed by settling a balance to zero - the friend
// relationship and the running balance are two completely separate things.
exports.getFriends = async (req, res, next) => {
  try {
    const friendships = await Friendship.find({
      status: 'accepted',
      $or: [{ userA: req.userId }, { userB: req.userId }]
    });

    const friendIds = friendships.map((f) =>
      String(f.userA) === String(req.userId) ? f.userB : f.userA
    );

    const friends = await User.find({ _id: { $in: friendIds } }).select('name email defaultCurrency avatarColor');

    const results = [];
    for (const friend of friends) {
      const sharedCurrencies = await Expense.distinct('currency', {
        participants: { $all: [String(req.userId), String(friend._id)] }
      });
      const balances = [];
      for (const currency of sharedCurrencies) {
        const amount = await computePairwiseBalance(req.userId, String(friend._id), currency);
        if (amount !== 0) balances.push({ currency, amount });
      }
      results.push({
        id: friend._id,
        name: friend.name,
        email: friend.email,
        avatarColor: friend.avatarColor,
        balances // [{ currency, amount }] - positive = friend owes you, never summed across currencies
      });
    }

    res.json(results);
  } catch (err) { next(err); }
};

exports.getFriendDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const friend = await User.findById(id).select('name email defaultCurrency avatarColor');
    if (!friend) return res.status(404).json({ message: 'Friend not found' });

    const [a, b] = [String(req.userId), String(id)].sort();
    const friendship = await Friendship.findOne({ userA: a, userB: b, status: 'accepted' });
    if (!friendship) return res.status(403).json({ message: 'You are not friends with this person' });

    // NOTE: no groupId filter here - a friend's balance includes both direct
    // expenses AND every group expense you two share, exactly like the real app.
    const distinctCurrencies = await Expense.distinct('currency', {
      participants: { $all: [req.userId, id] }
    });
    const currencies = distinctCurrencies.length ? distinctCurrencies : [];

    const byCurrency = [];
    for (const currency of currencies) {
      const netBalance = await computePairwiseBalance(req.userId, id, currency);
      if (netBalance === 0) continue;
      byCurrency.push({
        currency,
        netBalance,
        settleUpSuggestions: netBalance > 0
          ? [{ from: id, to: req.userId, amount: netBalance }]
          : netBalance < 0
            ? [{ from: req.userId, to: id, amount: Math.abs(netBalance) }]
            : []
      });
    }

    res.json({ friend, byCurrency });
  } catch (err) { next(err); }
};
