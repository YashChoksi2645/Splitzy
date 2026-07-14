const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PendingSignup = require('../models/PendingSignup');
const { toUserDTO } = require('../utils/userDTO');
const { generateOtp, hashOtp, compareOtp, OTP_TTL_MINUTES, RESEND_COOLDOWN_SECONDS, MAX_OTP_ATTEMPTS } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/email');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// NOTE: this direct register endpoint is kept for scripts/testing but is no
// longer used by the signup page - real signups now go through
// sendSignupOtp -> verifySignupOtp so every new account has a verified email.
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, defaultCurrency } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      defaultCurrency: defaultCurrency || 'INR'
    });

    const token = signToken(user._id);
    res.status(201).json({ token, user: toUserDTO(user) });
  } catch (err) { next(err); }
};

// POST /api/auth/send-otp
// Step 1 of signup: validate the form, email a 6-digit code, and stash the
// (hashed password, not-yet-real) signup in PendingSignup until it's confirmed.
exports.sendSignupOtp = async (req, res, next) => {
  try {
    const { name, email, password, defaultCurrency } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase();

    // A REAL (already-verified, non-placeholder) account with this email
    // blocks a fresh signup. A placeholder account (someone added you as a
    // friend/group member before you signed up) does NOT block it - signing
    // up "claims" that placeholder instead, handled in verifySignupOtp below.
    const existingReal = await User.findOne({ email: normalizedEmail, isPlaceholder: { $ne: true } });
    if (existingReal) return res.status(409).json({ message: 'Email already registered' });

    const existingPending = await PendingSignup.findOne({ email: normalizedEmail });
    if (existingPending) {
      const secondsSinceLastSend = (Date.now() - existingPending.lastSentAt.getTime()) / 1000;
      if (secondsSinceLastSend < RESEND_COOLDOWN_SECONDS) {
        return res.status(429).json({
          message: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLastSend)}s before requesting another code.`
        });
      }
    }

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const passwordHash = await bcrypt.hash(password, 10);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await PendingSignup.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        name,
        passwordHash,
        defaultCurrency: defaultCurrency || 'INR',
        otpHash,
        otpExpiresAt,
        attempts: 0,
        lastSentAt: new Date()
      },
      { upsert: true }
    );

    await sendOtpEmail(normalizedEmail, otp, name);

    res.status(200).json({ message: 'Verification code sent', email: normalizedEmail });
  } catch (err) { next(err); }
};

// POST /api/auth/verify-otp
// Step 2 of signup: check the code, then actually create (or claim) the User
// account and log them in, exactly like the old direct register did.
exports.verifySignupOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and code are required' });

    const normalizedEmail = email.toLowerCase();
    const pending = await PendingSignup.findOne({ email: normalizedEmail });
    if (!pending) return res.status(400).json({ message: 'No pending signup found for this email - request a new code.' });

    if (pending.otpExpiresAt < new Date()) {
      await pending.deleteOne();
      return res.status(400).json({ message: 'This code has expired - request a new one.' });
    }

    if (pending.attempts >= MAX_OTP_ATTEMPTS) {
      await pending.deleteOne();
      return res.status(400).json({ message: 'Too many incorrect attempts - request a new code.' });
    }

    const match = await compareOtp(String(otp), pending.otpHash);
    if (!match) {
      pending.attempts += 1;
      await pending.save();
      return res.status(400).json({ message: 'Incorrect code, please try again.' });
    }

    // Either claim an existing placeholder account (created when a friend/group
    // added this email before the real person signed up) or create a fresh one.
    let user = await User.findOne({ email: normalizedEmail });
    if (user && user.isPlaceholder) {
      user.name = pending.name;
      user.password = pending.passwordHash;
      user.defaultCurrency = pending.defaultCurrency;
      user.isPlaceholder = false;
      await user.save();
    } else if (user) {
      // Shouldn't normally happen (sendSignupOtp already blocks this case),
      // but guards against a race condition between two concurrent signups.
      await pending.deleteOne();
      return res.status(409).json({ message: 'Email already registered' });
    } else {
      user = await User.create({
        name: pending.name,
        email: normalizedEmail,
        password: pending.passwordHash,
        defaultCurrency: pending.defaultCurrency
      });
    }

    await pending.deleteOne();

    const token = signToken(user._id);
    res.status(201).json({ token, user: toUserDTO(user) });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user._id);
    res.json({ token, user: toUserDTO(user) });
  } catch (err) { next(err); }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(toUserDTO(user));
  } catch (err) { next(err); }
};
