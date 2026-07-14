const mongoose = require('mongoose');

// Immutable audit trail entries - powers the /activity feed
const ActivitySchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // everyone who should see this activity in their feed
  visibleTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  type: {
    type: String,
    enum: ['expense_added', 'expense_updated', 'expense_deleted', 'settlement', 'group_created', 'group_updated', 'group_deleted', 'member_added'],
    required: true
  },
  message: { type: String, required: true }, // pre-rendered human readable string
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },
  settlementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Settlement', default: null },
  amount: { type: Number, default: null },
  currency: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Activity', ActivitySchema);
