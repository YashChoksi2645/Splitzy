const Activity = require('../models/Activity');

exports.getActivity = async (req, res, next) => {
  try {
    const activities = await Activity.find({ visibleTo: req.userId })
      .populate('actor', 'name avatarColor')
      .populate('groupId', 'name')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(activities);
  } catch (err) { next(err); }
};
