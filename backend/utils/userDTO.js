// Every place that sends a user object to the frontend must use the SAME shape.
// This bug bit hard: /auth/login built {id, name, email, defaultCurrency} by hand,
// but /auth/me and /users/me returned the raw Mongoose document instead - which
// serializes with `_id`, not `id`. AuthContext overwrites its user state with
// whatever /auth/me returns on every app load, so `user.id` silently became
// `undefined` right after refresh - breaking anything that read user.id (e.g.
// "paidBy" defaulting to you, or your own entry in an expense's splits array).
function toUserDTO(userDoc) {
  if (!userDoc) return null;
  return {
    id: userDoc._id,
    name: userDoc.name,
    email: userDoc.email,
    defaultCurrency: userDoc.defaultCurrency,
    phone: userDoc.phone,
    timezone: userDoc.timezone,
    language: userDoc.language,
    avatarColor: userDoc.avatarColor
  };
}

module.exports = { toUserDTO };
