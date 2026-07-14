const mongoose = require('mongoose');

// Mirrors the "FriendCollections" table from the spec doc: a friend relationship
// has a lifecycle (pending -> accepted, or rejected) instead of just existing.
//
// IMPORTANT: once status is 'accepted', it is PERMANENT. Settling a balance to
// zero must NEVER delete or change this document - that's what caused the
// "friend disappears from sidebar" bug in the earlier version.
const FriendshipSchema = new mongoose.Schema({
  userA: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userB: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'accepted' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

FriendshipSchema.index({ userA: 1, userB: 1 }, { unique: true });

module.exports = mongoose.model('Friendship', FriendshipSchema);
