const bcrypt = require('bcryptjs');

function generateOtp() {
  // 6-digit numeric code, zero-padded (e.g. "042917")
  return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
}

async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

async function compareOtp(otp, hash) {
  return bcrypt.compare(otp, hash);
}

const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;

module.exports = { generateOtp, hashOtp, compareOtp, OTP_TTL_MINUTES, RESEND_COOLDOWN_SECONDS, MAX_OTP_ATTEMPTS };
