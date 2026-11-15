const express = require('express');
const Club = require('../models/Club');
const Member = require('../models/Member');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const asyncHandler = require('../utils/asyncHandler');
const { createError, countBy } = require('../utils/http');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireRole('admin'));
const DATE_RX = /^\d{4}-\d{2}-\d{2}$/;

function percent(part, whole) {
  return whole ? Math.round((part / whole) * 100) : null;
}

// GET /api/reports?from=2026-08-01&to=2026-12-31&category=Technical
// Events are limited to the date range; members are counted as of today.
router.get('/', asyncHandler(async (req, res) => {
  const { from, to, category } = req.query;
  for (const [key, value] of Object.entries({ from, to })) {
    if (value && !DATE_RX.test(value)) throw createError(400, `${key} must be a date like 2026-08-01`);
  }
  if (from && to && from > to) throw createError(400, '"from" must be before "to"');

  const clubFilter = category ? { category: String(category) } : {};
  const clubs = await Club.find(clubFilter).sort({ name: 1 });
  const clubIds = clubs.map((c) => c._id);

  const eventFilter = { club: { $in: clubIds } };
  if (from || to) {
    eventFilter.date = {};
    if (from) eventFilter.date.$gte = new Date(from);
    if (to) eventFilter.date.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  const [members, events] = await Promise.all([
    Member.find({ club: { $in: clubIds } }).select('club role'),
    Event.find(eventFilter),
  ]);
  const regs = await Registration.find({ event: { $in: events.map((e) => e._id) } }).select('event attended');

  const regsByEvent = {};
  regs.forEach((r) => {
    const key = String(r.event);
    regsByEvent[key] = regsByEvent[key] || { total: 0, attended: 0 };
    regsByEvent[key].total += 1;
    if (r.attended) regsByEvent[key].attended += 1;
  });

  const rows = clubs.map((club) => {
    const id = String(club._id);
    const clubMembers = members.filter((m) => String(m.club) === id);
    const clubEvents = events.filter((e) => String(e.club) === id);
    const completed = clubEvents.filter((e) => e.status === 'Completed');
    let registrations = 0;
    let attendedRegs = 0; // registrations/attendance for completed events only
    let completedRegs = 0;
    clubEvents.forEach((e) => {
      const r = regsByEvent[String(e._id)] || { total: 0, attended: 0 };
      registrations += r.total;
      if (e.status === 'Completed') {
        completedRegs += r.total;
        attendedRegs += r.attended;
      }
    });
    return {
      club: { _id: club._id, name: club.name, category: club.category, isActive: club.isActive },
      members: clubMembers.length,
      membersByRole: countBy(clubMembers, (m) => m.role),
      events: clubEvents.length,
      eventsByStatus: countBy(clubEvents, (e) => e.status),
      budget: clubEvents.filter((e) => e.status !== 'Cancelled').reduce((sum, e) => sum + e.budget, 0),
      registrations,
      attended: attendedRegs,
      attendanceRate: percent(attendedRegs, completedRegs),
      completedRegistrations: completedRegs,
      completedEvents: completed.length,
    };
  });

  const sum = (key) => rows.reduce((total, r) => total + r[key], 0);
  res.json({
    from: from || null,
    to: to || null,
    totals: {
      clubs: rows.length,
      members: sum('members'),
      events: sum('events'),
      completedEvents: sum('completedEvents'),
      budget: sum('budget'),
      registrations: sum('registrations'),
      attended: sum('attended'),
      attendanceRate: percent(sum('attended'), sum('completedRegistrations')),
    },
    clubs: rows,
  });
}));

module.exports = router;
