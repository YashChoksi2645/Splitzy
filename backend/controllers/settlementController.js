const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const User = require('../models/User');
const { logActivity } = require('../utils/activityLogger');

exports.createSettlement = async (req, res, next) => {
  try {
    const { groupId, payerId, payeeId, amount, currency, method } = req.body;
    if (!payerId || !payeeId || !amount || !currency) {
      return res.status(400).json({ message: 'payerId, payeeId, amount and currency are required' });
    }

    const settlement = await Settlement.create({
      groupId: groupId || null,
      payerId,
      payeeId,
      amount,
      currency,
      method: method || 'cash'
    });

    // NOTE: settling up NEVER touches the Friendship collection - the friend
    // relationship is permanent once established, regardless of balance reaching 0.

    let visibleTo = [payerId, payeeId];
    let groupName = null;
    if (groupId) {
      const group = await Group.findById(groupId);
      if (group) {
        visibleTo = group.members.map(String);
        groupName = group.name;
      }
    }

    const [payer, payee] = await Promise.all([
      User.findById(payerId).select('name'),
      User.findById(payeeId).select('name')
    ]);

    const methodLabel = { cash: 'cash', upi: 'UPI', card: 'card', other: 'another method' }[method || 'cash'];
    await logActivity({
      actor: req.userId,
      visibleTo,
      type: 'settlement',
      message: groupName
        ? `${payer.name} paid ${payee.name} ${currency}${amount} via ${methodLabel} in "${groupName}"`
        : `${payer.name} paid ${payee.name} ${currency}${amount} via ${methodLabel}`,
      groupId: groupId || null,
      settlementId: settlement._id,
      amount,
      currency
    });

    res.status(201).json(settlement);
  } catch (err) { next(err); }
};

exports.getSettlements = async (req, res, next) => {
  try {
    const filter = req.query.groupId ? { groupId: req.query.groupId } : {};
    const settlements = await Settlement.find(filter)
      .populate('payerId', 'name avatarColor')
      .populate('payeeId', 'name avatarColor')
      .sort({ date: -1 });
    res.json(settlements);
  } catch (err) { next(err); }
};
