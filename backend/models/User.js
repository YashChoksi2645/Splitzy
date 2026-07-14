const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  defaultCurrency: { type: String, default: 'INR' },
  phone: { type: String, default: '' },
  timezone: { type: String, default: 'GMT+05:30 Chennai' },
  language: { type: String, default: 'English' },
  avatarColor: { type: String, default: '#6366f1' }, // used for generated avatar initials
  // true = created automatically when someone added them by email/group invite
  // and they haven't actually signed up yet. false = a real registered account.
  isPlaceholder: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
