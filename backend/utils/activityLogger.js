const Activity = require('../models/Activity');

async function logActivity({ actor, visibleTo, type, message, groupId = null, expenseId = null, settlementId = null, amount = null, currency = null }) {
  return Activity.create({ actor, visibleTo, type, message, groupId, expenseId, settlementId, amount, currency });
}

module.exports = { logActivity };
