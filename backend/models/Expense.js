const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  description: { type: String, required: true },
  category: { type: String, default: 'general' },
  totalAmount: { type: Number, required: true },
  currency: { type: String, required: true },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  splitType: { type: String, enum: ['equal', 'exact', 'percentage', 'shares'], required: true },
  splits: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountOwed: { type: Number, required: true }
  }],
  // for 1-on-1 (non group) expenses, we still store both participants inside splits/paidBy
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  date: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Expense', ExpenseSchema);
