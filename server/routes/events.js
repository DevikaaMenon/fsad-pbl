const express = require('express');
const Event = require('../models/Event');
const Club = require('../models/Club');
const Registration = require('../models/Registration');
const asyncHandler = require('../utils/asyncHandler');
const { createError, pick, countBy, startOfToday } = require('../utils/http');
const { assertCanManage } = require('../middleware/auth');

const router = express.Router();
const FIELDS = ['title', 'club', 'date', 'time', 'venue', 'description', 'capacity', 'budget', 'status'];

async function ensureClubExists(clubId) {
  if (!clubId) return;
  const exists = await Club.exists({ _id: clubId });
  if (!exists) throw createError(400, 'The selected club does not exist');
}

// GET /api/events?club=<id>&status=Upcoming&when=upcoming|past
router.get('/', asyncHandler(async (req, res) => {
  const { club, status, when } = req.query;
  const filter = {};
  if (club) filter.club = String(club);
  if (status) filter.status = String(status);
  if (when === 'upcoming') filter.date = { $gte: startOfToday() };
  if (when === 'past') filter.date = { $lt: startOfToday() };

  const events = await Event.find(filter).sort({ date: when === 'past' ? -1 : 1, time: 1 });
  const ids = events.map((e) => e._id);
  const regs = await Registration.find({ event: { $in: ids } }).select('event usn');
  const registered = countBy(regs, (r) => r.event);
  const mine = new Set(regs.filter((r) => req.user.usn && r.usn === req.user.usn).map((r) => String(r.event)));
  res.json(events.map((e) => ({
    ...e.toJSON(),
    registered: registered[e._id] || 0,
    isRegistered: mine.has(String(e._id)),
  })));
}));

// includes the current user's own registration, if any
router.get('/:id', asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw createError(404, 'Event not found');
  const [registered, myRegistration] = await Promise.all([
    Registration.countDocuments({ event: event._id }),
    req.user.usn ? Registration.findOne({ event: event._id, usn: req.user.usn }) : null,
  ]);
  res.json({ ...event.toJSON(), registered, myRegistration });
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.club && req.user.role === 'lead') data.club = req.user.leadClub;
  if (data.club) assertCanManage(req.user, data.club);
  else if (req.user.role !== 'admin') throw createError(403, "You don't have permission to do that");
  await ensureClubExists(data.club);
  const event = new Event(data);
  await event.save();
  res.status(201).json({ ...event.toJSON(), registered: 0 });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw createError(404, 'Event not found');
  assertCanManage(req.user, event.club);
  const data = pick(req.body, FIELDS);
  if (data.club && String(data.club) !== String(event.club)) {
    assertCanManage(req.user, data.club);
    await ensureClubExists(data.club);
  }

  const registered = await Registration.countDocuments({ event: event._id });
  if (data.capacity !== undefined && Number(data.capacity) < registered) {
    throw createError(400, `${registered} students are already registered`, {
      capacity: `Can't be less than ${registered} (current registrations)`,
    });
  }
  Object.assign(event, data);
  await event.save();
  res.json({ ...event.toJSON(), registered });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw createError(404, 'Event not found');
  assertCanManage(req.user, event.club);
  await Promise.all([event.deleteOne(), Registration.deleteMany({ event: event._id })]);
  res.status(204).end();
}));

module.exports = router;
