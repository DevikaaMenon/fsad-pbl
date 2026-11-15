const express = require('express');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const asyncHandler = require('../utils/asyncHandler');
const { createError, pick } = require('../utils/http');
const { canManageClub, assertCanManage } = require('../middleware/auth');

const router = express.Router();

// GET /api/registrations?event=<id>   (club managers: the full list)
// GET /api/registrations?mine=true    (anyone: their own registrations, with event details)
router.get('/', asyncHandler(async (req, res) => {
  const { event, mine } = req.query;

  if (mine === 'true') {
    if (!req.user.usn) return res.json([]);
    const regs = await Registration.find({ usn: req.user.usn }).sort({ createdAt: -1 });
    const events = await Event.find({ _id: { $in: regs.map((r) => r.event) } });
    const byId = {};
    events.forEach((e) => { byId[e._id] = e.toJSON(); });
    return res.json(regs.filter((r) => byId[r.event]).map((r) => ({ ...r.toJSON(), eventInfo: byId[r.event] })));
  }

  if (!event) {
    if (req.user.role !== 'admin') throw createError(400, 'Pass ?event=<id> or ?mine=true');
    return res.json(await Registration.find().sort({ createdAt: -1 }));
  }
  const ev = await Event.findById(event);
  if (!ev) throw createError(404, 'Event not found');
  assertCanManage(req.user, ev.club);
  res.json(await Registration.find({ event: ev._id }).sort({ createdAt: 1 }));
}));

// Students register themselves (details come from their account).
// Club managers can also register someone else by sending name/usn/email.
router.post('/', asyncHandler(async (req, res) => {
  if (!req.body.event) throw createError(400, 'Validation failed', { event: 'Event is required' });
  const event = await Event.findById(req.body.event);
  if (!event) throw createError(400, 'That event does not exist');

  const manager = canManageClub(req.user, event.club);
  let data;
  if (manager && req.body.usn) {
    data = { ...pick(req.body, ['name', 'usn', 'email']), event: event._id };
  } else {
    if (!req.user.usn) throw createError(400, 'Add your USN to your profile before registering');
    data = { event: event._id, name: req.user.name, usn: req.user.usn, email: req.user.email };
  }

  if (event.status !== 'Upcoming') throw createError(400, `Registrations are closed (event is ${event.status.toLowerCase()})`);
  const taken = await Registration.countDocuments({ event: event._id });
  if (taken >= event.capacity) throw createError(409, 'Sorry, this event is full');

  try {
    const reg = await Registration.create(data);
    res.status(201).json(reg);
  } catch (err) {
    if (err.code === 11000) {
      const msg = manager && req.body.usn ? 'This USN is already registered for the event' : "You're already registered for this event";
      throw createError(409, msg, { usn: 'Already registered' });
    }
    throw err;
  }
}));

// only attendance can change, and only club managers can mark it
router.put('/:id', asyncHandler(async (req, res) => {
  const reg = await Registration.findById(req.params.id);
  if (!reg) throw createError(404, 'Registration not found');
  const event = await Event.findById(reg.event);
  assertCanManage(req.user, event && event.club);
  if (req.body.attended !== undefined) reg.attended = Boolean(req.body.attended);
  await reg.save();
  res.json(reg);
}));

// managers can remove anyone; a student can cancel their own before the event
router.delete('/:id', asyncHandler(async (req, res) => {
  const reg = await Registration.findById(req.params.id);
  if (!reg) throw createError(404, 'Registration not found');
  const event = await Event.findById(reg.event);
  const own = req.user.usn && reg.usn === req.user.usn;
  if (!canManageClub(req.user, event && event.club)) {
    if (!own) throw createError(403, "You don't have permission to do that");
    if (event && event.status !== 'Upcoming') throw createError(400, 'You can only cancel before the event');
  }
  await reg.deleteOne();
  res.status(204).end();
}));

module.exports = router;
