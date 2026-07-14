const Group = require('../models/Group');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Friendship = require('../models/Friendship');
const { computeSimplifiedDebts } = require('../utils/debtSimplify');
const { logActivity } = require('../utils/activityLogger');

// Every group endpoint below needs this: without it, any logged-in user could
// view, edit, or add members to ANY group just by knowing/guessing its id -
// there was previously no check that the requester is actually a member.
// Handles both raw ObjectId entries (group.members before populate) and full
// populated user documents (after populate) - comparing a populated doc with
// String() directly never matches the plain id string, which is exactly what
// broke getGroupById/getGroupBalances (every legitimate member got rejected).
function isMember(group, userId) {
  return group.members.some((m) => {
    const memberId = m && m._id ? m._id : m;
    return String(memberId) === String(userId);
  });
}

exports.createGroup = async (req, res, next) => {
  try {
    const { name, description, groupType, memberEmails = [] } = req.body;
    if (!name) return res.status(400).json({ message: 'Group name is required' });

    const memberIds = new Set([String(req.userId)]);
    for (const email of memberEmails) {
      if (!email) continue;
      let user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        user = await User.create({
          name: email.split('@')[0],
          email: email.toLowerCase(),
          password: 'PLACEHOLDER_NOT_LOGGED_IN',
          defaultCurrency: 'INR'
        });
      }
      memberIds.add(String(user._id));

      // creating a group with someone also makes them a friend (persistent)
      if (String(user._id) !== String(req.userId)) {
        const [a, b] = [req.userId, String(user._id)].sort();
        await Friendship.findOneAndUpdate(
          { userA: a, userB: b },
          { $setOnInsert: { status: 'accepted', requestedBy: req.userId } },
          { upsert: true }
        );
      }
    }

    const group = await Group.create({
      name,
      description,
      groupType: groupType || 'Other',
      members: Array.from(memberIds),
      createdBy: req.userId
    });

    await logActivity({
      actor: req.userId,
      visibleTo: Array.from(memberIds),
      type: 'group_created',
      message: `created the group "${name}"`,
      groupId: group._id
    });

    res.status(201).json(group);
  } catch (err) { next(err); }
};

exports.getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.userId }).sort({ createdAt: -1 });
    res.json(groups);
  } catch (err) { next(err); }
};

exports.getGroupById = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).populate('members', 'name email avatarColor');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!isMember(group, req.userId)) return res.status(403).json({ message: 'You are not a member of this group' });
    res.json(group);
  } catch (err) { next(err); }
};

exports.updateGroup = async (req, res, next) => {
  try {
    const existing = await Group.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Group not found' });
    if (!isMember(existing, req.userId)) return res.status(403).json({ message: 'You are not a member of this group' });

    const { name, description, groupType } = req.body;
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $set: { ...(name && { name }), ...(description !== undefined && { description }), ...(groupType && { groupType }) } },
      { new: true }
    );

    await logActivity({
      actor: req.userId,
      visibleTo: group.members,
      type: 'group_updated',
      message: `updated the group "${group.name}"`,
      groupId: group._id
    });

    await group.populate('members', 'name email avatarColor');
    res.json(group);
  } catch (err) { next(err); }
};

exports.addMember = async (req, res, next) => {
  try {
    const { email } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!isMember(group, req.userId)) return res.status(403).json({ message: 'You are not a member of this group' });

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name: email.split('@')[0],
        email: email.toLowerCase(),
        password: 'PLACEHOLDER_NOT_LOGGED_IN',
        defaultCurrency: 'INR'
      });
    }

    if (!group.members.map(String).includes(String(user._id))) {
      group.members.push(user._id);
      await group.save();
    }

    const [a, b] = [req.userId, String(user._id)].sort();
    await Friendship.findOneAndUpdate(
          { userA: a, userB: b },
          { $setOnInsert: { status: 'accepted', requestedBy: req.userId } },
          { upsert: true }
        );

    await logActivity({
      actor: req.userId,
      visibleTo: group.members,
      type: 'member_added',
      message: `added ${user.name} to "${group.name}"`,
      groupId: group._id
    });

    await group.populate('members', 'name email avatarColor');
    res.json(group);
  } catch (err) { next(err); }
};

// POST /api/groups/:id/leave
// Real Splitwise blocks leaving while you still have an outstanding balance in
// the group (you'd leave someone unable to collect from/pay you). We mirror
// that: if your net balance in ANY currency isn't zero, return a 409 with the
// details so the UI can show a clear warning instead of silently letting you go.
exports.leaveGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.members.map(String).includes(String(req.userId))) {
      return res.status(400).json({ message: "You're not a member of this group" });
    }

    const distinctCurrencies = await Expense.distinct('currency', { groupId: group._id });
    const outstanding = [];
    for (const currency of distinctCurrencies) {
      const { ledger } = await computeSimplifiedDebts({ groupId: group._id, currency });
      const myBalance = Math.round(((ledger[String(req.userId)] || 0)) * 100) / 100;
      if (myBalance !== 0) outstanding.push({ currency, balance: myBalance });
    }

    if (outstanding.length > 0) {
      return res.status(409).json({
        message: "You still have an outstanding balance in this group. Settle up before leaving.",
        outstanding
      });
    }

    group.members = group.members.filter((m) => String(m) !== String(req.userId));
    await group.save();

    const leaver = await User.findById(req.userId).select('name');
    await logActivity({
      actor: req.userId,
      visibleTo: [...group.members, req.userId],
      type: 'group_updated',
      message: `${leaver.name} left the group "${group.name}"`,
      groupId: group._id
    });

    res.json({ message: 'You left the group' });
  } catch (err) { next(err); }
};

exports.getGroupExpenses = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!isMember(group, req.userId)) return res.status(403).json({ message: 'You are not a member of this group' });

    const expenses = await Expense.find({ groupId: req.params.id })
      .populate('paidBy', 'name avatarColor')
      .populate('splits.userId', 'name avatarColor')
      .populate('groupId', 'name')
      .sort({ date: -1 });
    res.json(expenses);
  } catch (err) { next(err); }
};

// GET /api/groups/:id/balances -> runs the debt simplification engine scoped to this group
exports.getGroupBalances = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).populate('members', 'name avatarColor');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!isMember(group, req.userId)) return res.status(403).json({ message: 'You are not a member of this group' });

    // Detect every currency actually used in this group's expenses so we never
    // mix e.g. INR and USD balances into one number.
    const distinctCurrencies = await Expense.distinct('currency', { groupId: req.params.id });
    const currencies = distinctCurrencies.length ? distinctCurrencies : ['INR'];

    const byCurrency = [];
    // also keep a combined "balances per member" view using the member's most-used
    // currency, for the simple list shown in the right sidebar
    const combinedLedger = {};

    for (const currency of currencies) {
      const { ledger, simplified } = await computeSimplifiedDebts({ groupId: req.params.id, currency });
      byCurrency.push({ currency, simplifiedSettlements: simplified, ledger });
      for (const [uid, bal] of Object.entries(ledger)) {
        combinedLedger[uid] = combinedLedger[uid] || {};
        combinedLedger[uid][currency] = Math.round(bal * 100) / 100;
      }
    }

    const perMember = group.members.map((m) => ({
      id: m._id,
      name: m.name,
      avatarColor: m.avatarColor,
      balances: combinedLedger[String(m._id)] || {} // { INR: 120.5, USD: -20 }
    }));

    res.json({
      balances: perMember,
      byCurrency, // [{ currency, simplifiedSettlements, ledger }]
      multipleCurrencies: currencies.length > 1
    });
  } catch (err) { next(err); }
};
