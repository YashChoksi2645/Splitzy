const mongoose = require('mongoose');

const SettlementSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  payerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  payeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  method: { type: String, enum: ['cash', 'upi', 'card', 'other'], default: 'cash' },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Settlement', SettlementSchema);
