const express = require('express');
const Club = require('../models/Club');
const Member = require('../models/Member');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Announcement = require('../models/Announcement');
const JoinRequest = require('../models/JoinRequest');
const User = require('../models/User');
const { requireRole, assertCanManage } = require('../middleware/auth');
const appEvents = require('../utils/appEvents');
const asyncHandler = require('../utils/asyncHandler');
const { createError, pick, escapeRegex, countBy, startOfToday } = require('../utils/http');

const router = express.Router();
const FIELDS = ['name', 'category', 'description', 'coordinator', 'email', 'foundedYear', 'isActive'];

// GET /api/clubs?category=Technical&active=true&q=deb
router.get('/', asyncHandler(async (req, res) => {
  const { category, active, q } = req.query;
  const filter = {};
  if (category) filter.category = String(category);
  if (active === 'true' || active === 'false') filter.isActive = active === 'true';
  if (q) filter.name = { $regex: escapeRegex(String(q)), $options: 'i' };

  const clubs = await Club.find(filter).sort({ name: 1 });
  const ids = clubs.map((c) => c._id);
  const [members, upcoming, pending] = await Promise.all([
    Member.find({ club: { $in: ids } }).select('club'),
    Event.find({ club: { $in: ids }, status: 'Upcoming', date: { $gte: startOfToday() } }).select('club'),
    JoinRequest.find({ club: { $in: ids }, status: 'Pending' }).select('club'),
  ]);
  const memberCount = countBy(members, (m) => m.club);
  const upcomingCount = countBy(upcoming, (e) => e.club);
  const pendingCount = countBy(pending, (r) => r.club);

  res.json(clubs.map((c) => ({
    ...c.toJSON(),
    memberCount: memberCount[c._id] || 0,
    upcomingEvents: upcomingCount[c._id] || 0,
    pendingRequests: pendingCount[c._id] || 0,
  })));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const club = await Club.findOne({ _id: req.params.id });
  if (!club) throw createError(404, 'Club not found');
  const [memberCount, upcomingEvents, pendingRequests] = await Promise.all([
    Member.countDocuments({ club: club._id }),
    Event.countDocuments({ club: club._id, status: 'Upcoming', date: { $gte: startOfToday() } }),
    JoinRequest.countDocuments({ club: club._id, status: 'Pending' }),
  ]);
  res.json({ ...club.toJSON(), memberCount, upcomingEvents, pendingRequests });
}));

router.post('/', requireRole('admin'), asyncHandler(async (req, res) => {
  const club = new Club(pick(req.body, FIELDS));
  await club.save();
  appEvents.emit('club:created', club);
  res.status(201).json(club);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const club = await Club.findById(req.params.id);
  if (!club) throw createError(404, 'Club not found');
  assertCanManage(req.user, club._id);
  Object.assign(club, pick(req.body, FIELDS));
  await club.save();
  res.json(club);
}));

// deleting a club removes everything that belongs to it
router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const club = await Club.findByIdAndDelete(req.params.id);
  if (!club) throw createError(404, 'Club not found');
  const events = await Event.find({ club: club._id }).select('_id');
  await Promise.all([
    Registration.deleteMany({ event: { $in: events.map((e) => e._id) } }),
    Event.deleteMany({ club: club._id }),
    Member.deleteMany({ club: club._id }),
    Announcement.deleteMany({ club: club._id }),
    JoinRequest.deleteMany({ club: club._id }),
    // its leads go back to being students
    User.updateMany({ leadClub: club._id }, { $set: { role: 'student' }, $unset: { leadClub: 1 } }),
  ]);
  appEvents.emit('club:deleted', club);
  res.status(204).end();
}));

module.exports = router;
