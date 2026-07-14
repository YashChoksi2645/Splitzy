const Expense = require('../models/Expense');
const Group = require('../models/Group');
const Friendship = require('../models/Friendship');
const User = require('../models/User');
const { logActivity } = require('../utils/activityLogger');

function validateSplits(splitType, totalAmount, splits) {
  const EPS = 0.02;
  if (splitType === 'exact') {
    const sum = splits.reduce((s, x) => s + x.amountOwed, 0);
    if (Math.abs(sum - totalAmount) > EPS) {
      throw Object.assign(new Error(`Split amounts (${sum}) must add up to the total (${totalAmount})`), { status: 400 });
    }
  }
  // percentage/shares are expected to already be converted to amountOwed by the caller,
  // but we still sanity check that the split total matches (frontend does the % / share math)
  if (splitType === 'percentage' || splitType === 'shares' || splitType === 'equal') {
    const sum = splits.reduce((s, x) => s + x.amountOwed, 0);
    if (Math.abs(sum - totalAmount) > 0.05) {
      throw Object.assign(new Error(`Computed splits (${sum.toFixed(2)}) do not match total (${totalAmount})`), { status: 400 });
    }
  }
}

exports.createExpense = async (req, res, next) => {
  try {
    const {
      groupId, description, category, totalAmount, currency,
      paidBy, splitType, splits, participants, date, notes
    } = req.body;

    if (!description || !totalAmount || !currency || !paidBy || !splitType || !splits?.length) {
      return res.status(400).json({ message: 'Missing required expense fields' });
    }

    validateSplits(splitType, totalAmount, splits);

    const expense = await Expense.create({
      groupId: groupId || null,
      description,
      category: category || 'general',
      totalAmount,
      currency,
      paidBy,
      splitType,
      splits,
      participants: participants || splits.map(s => s.userId),
      date: date || Date.now(),
      createdBy: req.userId,
      notes: notes || ''
    });

    // Determine who should see this in their activity feed + ensure friendships exist
    let visibleTo = expense.participants.map(String);
    let groupName = null;

    if (groupId) {
      const group = await Group.findById(groupId);
      if (group) {
        visibleTo = group.members.map(String);
        groupName = group.name;
      }
    } else {
      // direct 1-1 expense: make sure a Friendship record exists between all pairs
      const ids = expense.participants.map(String);
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const [a, b] = [ids[i], ids[j]].sort();
          await Friendship.findOneAndUpdate(
            { userA: a, userB: b },
            { $setOnInsert: { status: 'accepted', requestedBy: req.userId } },
            { upsert: true }
          );
        }
      }
    }

    const actor = await User.findById(req.userId).select('name');
    await logActivity({
      actor: req.userId,
      visibleTo,
      type: 'expense_added',
      message: groupName
        ? `${actor.name} added "${description}" in "${groupName}"`
        : `${actor.name} added "${description}"`,
      groupId: groupId || null,
      expenseId: expense._id,
      amount: totalAmount,
      currency
    });

    res.status(201).json(expense);
  } catch (err) { next(err); }
};

exports.getExpenseById = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('paidBy', 'name avatarColor')
      .populate('splits.userId', 'name avatarColor')
      .populate('groupId', 'name');
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (!expense.participants.map(String).includes(String(req.userId))) {
      return res.status(403).json({ message: 'You are not part of this expense' });
    }
    res.json(expense);
  } catch (err) { next(err); }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const existing = await Expense.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Expense not found' });

    // Only someone actually involved in this expense can edit it - without this,
    // any logged-in user could edit an arbitrary expense by guessing/reusing an id.
    if (!existing.participants.map(String).includes(String(req.userId))) {
      return res.status(403).json({ message: 'You are not part of this expense' });
    }

    const { description, totalAmount, currency, paidBy, splitType, splits, category, notes, date } = req.body;
    if (splitType && totalAmount && splits) {
      validateSplits(splitType, totalAmount, splits);
    }

    Object.assign(existing, {
      ...(description && { description }),
      ...(totalAmount && { totalAmount }),
      ...(currency && { currency }),
      ...(paidBy && { paidBy }),
      ...(splitType && { splitType }),
      ...(splits && { splits }),
      ...(category && { category }),
      ...(notes !== undefined && { notes }),
      ...(date && { date })
    });
    await existing.save();

    let visibleTo = existing.participants.map(String);
    let groupName = null;
    if (existing.groupId) {
      const group = await Group.findById(existing.groupId);
      if (group) {
        visibleTo = group.members.map(String);
        groupName = group.name;
      }
    }

    const actor = await User.findById(req.userId).select('name');
    await logActivity({
      actor: req.userId,
      visibleTo,
      type: 'expense_updated',
      message: groupName
        ? `${actor.name} updated "${existing.description}" in "${groupName}"`
        : `${actor.name} updated "${existing.description}"`,
      groupId: existing.groupId,
      expenseId: existing._id,
      amount: existing.totalAmount,
      currency: existing.currency
    });

    res.json(existing);
  } catch (err) { next(err); }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const existing = await Expense.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Expense not found' });

    if (!existing.participants.map(String).includes(String(req.userId))) {
      return res.status(403).json({ message: 'You are not part of this expense' });
    }

    let visibleTo = existing.participants.map(String);
    let groupName = null;
    if (existing.groupId) {
      const group = await Group.findById(existing.groupId);
      if (group) {
        visibleTo = group.members.map(String);
        groupName = group.name;
      }
    }

    await existing.deleteOne();

    const actor = await User.findById(req.userId).select('name');
    await logActivity({
      actor: req.userId,
      visibleTo,
      type: 'expense_deleted',
      message: groupName
        ? `${actor.name} deleted "${existing.description}" in "${groupName}"`
        : `${actor.name} deleted "${existing.description}"`,
      groupId: existing.groupId
    });

    res.json({ message: 'Expense deleted' });
  } catch (err) { next(err); }
};

// Direct (non-group) ledger between the logged-in user and a friend
exports.getDirectExpenses = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    // NOTE: this powers the Friend Page ledger stream, which per spec should show
    // "shared items between you and this specific friend (pulled from across all
    // common groups plus direct expenses)" - so we intentionally do NOT filter to
    // groupId: null here; any expense (group or direct) both of you are part of belongs.
    const expenses = await Expense.find({
      participants: { $all: [req.userId, friendId] }
    })
      .populate('paidBy', 'name avatarColor')
      .populate('splits.userId', 'name avatarColor')
      .populate('groupId', 'name')
      .sort({ date: -1 });
    res.json(expenses);
  } catch (err) { next(err); }
};

// All expenses (group + direct) touching the logged in user, for the "All expenses" tab
exports.getAllUserExpenses = async (req, res, next) => {
  try {
    const expenses = await Expense.find({ participants: req.userId })
      .populate('paidBy', 'name avatarColor')
      .populate('splits.userId', 'name avatarColor')
      .populate('groupId', 'name')
      .sort({ date: -1 });
    res.json(expenses);
  } catch (err) { next(err); }
};
