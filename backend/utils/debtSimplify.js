const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');

/**
 * Cash-Flow Debt Minimization Engine.
 * Computes net balance per user for a given scope (a group, or a direct 1-1 pair),
 * then greedily matches max-creditor with max-debtor to minimize the number
 * of transactions required to settle everyone up.
 *
 * @param {Object} opts
 * @param {String} [opts.groupId] - if provided, scope is that group's expenses+settlements
 * @param {Array}  [opts.userIds] - if no groupId, restrict the ledger to these user ids (used for 1-1 friend view)
 * @param {String} [opts.currency] - if provided, ONLY include expenses/settlements in this currency.
 *   Balances in different currencies must never be summed together (₹100 + $100 is meaningless),
 *   so callers that need a per-currency breakdown call this once per currency involved.
 * @returns {Promise<Array<{from, to, amount}>>}
 */
async function computeSimplifiedDebts({ groupId = null, userIds = null, currency = null }) {
  const ledger = {}; // userId(string) -> net balance (positive = is owed money)

  const expenseFilter = groupId ? { groupId } : { groupId: null };
  if (currency) expenseFilter.currency = currency;
  const expenses = await Expense.find(expenseFilter);

  const settlementFilter = groupId ? { groupId } : { groupId: null };
  if (currency) settlementFilter.currency = currency;
  const settlements = await Settlement.find(settlementFilter);

  const touches = (idsInvolved) => {
    if (!userIds) return true;
    const idSet = new Set(userIds.map(String));
    return idsInvolved.some((id) => idSet.has(String(id)));
  };

  for (const exp of expenses) {
    const involved = [exp.paidBy, ...exp.splits.map((s) => s.userId)];
    if (!touches(involved)) continue;

    const payerKey = String(exp.paidBy);
    ledger[payerKey] = (ledger[payerKey] || 0) + exp.totalAmount;

    for (const split of exp.splits) {
      const key = String(split.userId);
      ledger[key] = (ledger[key] || 0) - split.amountOwed;
    }
  }

  for (const s of settlements) {
    const involved = [s.payerId, s.payeeId];
    if (!touches(involved)) continue;

    const payerKey = String(s.payerId);
    const payeeKey = String(s.payeeId);
    ledger[payerKey] = (ledger[payerKey] || 0) + s.amount;
    ledger[payeeKey] = (ledger[payeeKey] || 0) - s.amount;
  }

  // Round to avoid floating point noise
  const EPS = 0.01;
  const creditors = []; // { id, balance } balance > 0, owed money
  const debtors = [];   // { id, balance } balance < 0, owes money

  for (const [id, balanceRaw] of Object.entries(ledger)) {
    const balance = Math.round(balanceRaw * 100) / 100;
    if (balance > EPS) creditors.push({ id, balance });
    else if (balance < -EPS) debtors.push({ id, balance });
  }

  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => a.balance - b.balance); // most negative first

  const result = [];

  while (creditors.length && debtors.length) {
    const creditor = creditors[0];
    const debtor = debtors[0];
    const debtorOwes = Math.abs(debtor.balance);
    const settleAmount = Math.min(debtorOwes, creditor.balance);
    const rounded = Math.round(settleAmount * 100) / 100;

    if (rounded > EPS) {
      result.push({ from: debtor.id, to: creditor.id, amount: rounded });
    }

    creditor.balance -= settleAmount;
    debtor.balance += settleAmount;

    if (Math.abs(creditor.balance) < EPS) creditors.shift();
    if (Math.abs(debtor.balance) < EPS) debtors.shift();

    // re-sort in case of partial settle
    creditors.sort((a, b) => b.balance - a.balance);
    debtors.sort((a, b) => a.balance - b.balance);
  }

  return { ledger, simplified: result };
}

/**
 * Computes the direct bilateral balance between exactly two people, across
 * BOTH group expenses and direct expenses, in a given currency.
 *
 * This is deliberately separate from computeSimplifiedDebts, which fixes two
 * bugs that function had when (mis)used for a friend pair:
 *   1. It filtered expenses to `groupId: null` whenever no group was given,
 *      which silently excluded every group expense from a friend's balance.
 *   2. Even with that fixed, reading a single user's ledger entry out of a
 *      multi-person expense's ledger picks up contributions from OTHER
 *      participants too (e.g. a 4-person dinner), not just the one friend -
 *      overstating what that specific friend owes.
 *
 * The fix: only count an expense/settlement toward the A-B balance when the
 * payer is actually A or B (a third person paying doesn't create a direct
 * A-B obligation - it creates A-payer and B-payer obligations instead, which
 * are captured separately when computing A's or B's balance with that payer).
 *
 * @returns {Promise<Number>} positive = userB owes userA; negative = userA owes userB
 */
async function computePairwiseBalance(userIdA, userIdB, currency = null) {
  const a = String(userIdA);
  const b = String(userIdB);

  const expenseFilter = { participants: { $all: [a, b] } };
  if (currency) expenseFilter.currency = currency;
  const expenses = await Expense.find(expenseFilter);

  const settlementFilter = {
    $or: [
      { payerId: a, payeeId: b },
      { payerId: b, payeeId: a }
    ]
  };
  if (currency) settlementFilter.currency = currency;
  const settlements = await Settlement.find(settlementFilter);

  let balance = 0; // positive = b owes a

  for (const exp of expenses) {
    const payer = String(exp.paidBy);
    if (payer !== a && payer !== b) continue; // a third person paid - no direct A-B obligation from this expense

    const splitFor = (uid) => exp.splits.find((s) => String(s.userId) === uid);

    if (payer === a) {
      const bSplit = splitFor(b);
      if (bSplit) balance += bSplit.amountOwed; // b owes a their share
    } else {
      const aSplit = splitFor(a);
      if (aSplit) balance -= aSplit.amountOwed; // a owes b their share
    }
  }

  for (const s of settlements) {
    const payer = String(s.payerId);
    if (payer === b) balance -= s.amount; // b already paid a (or paid down what they owed)
    else if (payer === a) balance += s.amount; // a already paid b (paying down what a owed)
  }

  return Math.round(balance * 100) / 100;
}

module.exports = { computeSimplifiedDebts, computePairwiseBalance };
