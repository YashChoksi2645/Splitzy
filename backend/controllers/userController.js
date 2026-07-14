const bcrypt = require('bcryptjs');
const { toUserDTO } = require('../utils/userDTO');
const Expense = require('../models/Expense');
const Friendship = require('../models/Friendship');
const User = require('../models/User');
const { computePairwiseBalance } = require('../utils/debtSimplify');

// GET /api/users/search?q=...
// Powers the typeahead dropdown when adding a friend or a group member -
// lets the person see and pick an existing account instead of guessing an email.
exports.searchUsers = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await User.find({
      _id: { $ne: req.userId },
      $or: [{ name: regex }, { email: regex }]
    })
      .select('name email avatarColor')
      .limit(8);

    res.json(users);
  } catch (err) { next(err); }
};

// PUT /api/users/me - update profile fields shown on the Account page
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone, defaultCurrency } = req.body;

    if (email) {
      const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.userId } });
      if (existing) return res.status(409).json({ message: 'That email is already in use' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        $set: {
          ...(name && { name }),
          ...(email && { email: email.toLowerCase() }),
          ...(phone !== undefined && { phone }),
          ...(defaultCurrency && { defaultCurrency })
        }
      },
      { new: true }
    ).select('-password');

    res.json(toUserDTO(user));
  } catch (err) { next(err); }
};

// PUT /api/users/me/password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.userId);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated' });
  } catch (err) { next(err); }
};

// GET /api/users/dashboard-summary
// Powers the top stat ribbon + "you owe" / "you are owed" split panel columns.
//
// IMPORTANT: balances in different currencies are NEVER added together (₹100 + $100
// is not ₹200 or $200 - it's meaningless). Instead we compute a per-friend ledger
// PER CURRENCY (by looking at the actual expenses shared with that friend, not just
// their default currency), then group the totals into separate currency buckets -
// exactly like the real Splitwise screenshot showing "you are owed ₹1666.67" AND
// "you are owed USD800.00" as two separate lines.
exports.getDashboardSummary = async (req, res, next) => {
  try {
    const friendships = await Friendship.find({
      $or: [{ userA: req.userId }, { userB: req.userId }]
    });
    const friendIds = friendships.map((f) =>
      String(f.userA) === String(req.userId) ? f.userB : f.userA
    );
    const friends = await User.find({ _id: { $in: friendIds } }).select('name avatarColor defaultCurrency');

    // youOwe / youAreOwed entries can appear more than once per friend if they
    // share balances in more than one currency.
    const youOwe = [];
    const youAreOwed = [];
    const perCurrencyTotals = {}; // { INR: { owe: x, owed: y }, USD: { ... } }

    for (const friend of friends) {
      // Find every distinct currency that appears across expenses/settlements
      // touching both users, then compute a separate ledger for each one.
      const sharedExpenses = await Expense.find({
        participants: { $all: [req.userId, String(friend._id)] }
      }).select('currency');
      const currencies = new Set(sharedExpenses.map((e) => e.currency));
      if (currencies.size === 0) continue;

      for (const currency of currencies) {
        const myBalance = await computePairwiseBalance(req.userId, String(friend._id), currency);
        if (myBalance === 0) continue;

        perCurrencyTotals[currency] = perCurrencyTotals[currency] || { owe: 0, owed: 0 };

        const entry = {
          id: friend._id,
          name: friend.name,
          avatarColor: friend.avatarColor,
          amount: Math.abs(myBalance),
          currency
        };

        if (myBalance < 0) {
          youOwe.push(entry);
          perCurrencyTotals[currency].owe += Math.abs(myBalance);
        } else {
          youAreOwed.push(entry);
          perCurrencyTotals[currency].owed += myBalance;
        }
      }
    }

    const currencyBreakdown = Object.entries(perCurrencyTotals).map(([currency, totals]) => ({
      currency,
      youOweTotal: Math.round(totals.owe * 100) / 100,
      youAreOwedTotal: Math.round(totals.owed * 100) / 100,
      netBalance: Math.round((totals.owed - totals.owe) * 100) / 100
    }));

    res.json({
      // kept for backwards compatibility with older UI - reflects the user's default currency only
      defaultCurrency: (await User.findById(req.userId).select('defaultCurrency'))?.defaultCurrency || 'INR',
      multipleCurrencies: currencyBreakdown.length > 1,
      currencyBreakdown,
      youOwe: youOwe.sort((a, b) => b.amount - a.amount),
      youAreOwed: youAreOwed.sort((a, b) => b.amount - a.amount)
    });
  } catch (err) { next(err); }
};

exports.getAllExpensesForUser = require('./expenseController').getAllUserExpenses;
