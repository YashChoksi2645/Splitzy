const mongoose = require('mongoose');

// Matches the spec doc's Notifications table: friend requests, group invites,
// and payment reminders all show up here.
const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who sees this notification
  type: { type: String, enum: ['friend_request', 'group_invite', 'payment_reminder'], required: true },
  message: { type: String, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId, default: null }, // e.g. the Friendship or Group id
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
