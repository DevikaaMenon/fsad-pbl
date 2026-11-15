// Admin-only user management: list accounts, change roles, assign club leads.
const express = require('express');
const User = require('../models/User');
const Club = require('../models/Club');
const asyncHandler = require('../utils/asyncHandler');
const { createError, escapeRegex } = require('../utils/http');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireRole('admin'));

// GET /api/users?role=lead&q=priya
router.get('/', asyncHandler(async (req, res) => {
  const { role, q } = req.query;
  const filter = {};
  if (role) filter.role = String(role);
  if (q) {
    const rx = { $regex: escapeRegex(String(q)), $options: 'i' };
    filter.$or = [{ name: rx }, { email: rx }, { usn: rx }];
  }
  const users = await User.find(filter).sort({ role: 1, name: 1 });
  res.json(users);
}));

// PUT /api/users/:id  { role, leadClub }
router.put('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw createError(404, 'User not found');
  const { role, leadClub } = req.body;

  if (String(user._id) === String(req.user._id) && role && role !== 'admin') {
    throw createError(400, "You can't remove your own admin access");
  }
  if (role !== undefined) user.role = role;
  if (leadClub !== undefined) {
    if (leadClub && !(await Club.exists({ _id: leadClub }))) throw createError(400, 'That club does not exist');
    user.leadClub = leadClub || undefined;
  }
  await user.save();
  res.json(user);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw createError(400, "You can't delete your own account");
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw createError(404, 'User not found');
  res.status(204).end();
}));

module.exports = router;
