const mongoose = require('mongoose');

// Holds a signup attempt while it's waiting on email verification. Nothing
// becomes a real User document until the OTP is confirmed - this way an
// unverified/abandoned signup never clutters the Users collection or blocks
// that email address from being used again.
const PendingSignupSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  defaultCurrency: { type: String, default: 'INR' },
  otpHash: { type: String, required: true },
  otpExpiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 }, // failed OTP guesses - locks out after too many
  lastSentAt: { type: Date, default: Date.now } // for resend cooldown
}, { timestamps: true });

// Mongo TTL index: automatically deletes abandoned pending signups an hour
// after the OTP would have expired anyway, so this collection self-cleans.
PendingSignupSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('PendingSignup', PendingSignupSchema);
