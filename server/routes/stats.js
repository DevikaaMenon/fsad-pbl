const express = require('express');
const Club = require('../models/Club');
const Member = require('../models/Member');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Announcement = require('../models/Announcement');
const JoinRequest = require('../models/JoinRequest');
const asyncHandler = require('../utils/asyncHandler');
const { startOfToday } = require('../utils/http');

const router = express.Router();

// GET /api/stats: dashboard numbers. "pendingRequests" depends on who is asking:
// admin = all clubs, lead = their club, student = their own requests.
router.get('/', asyncHandler(async (req, res) => {
  const user = req.user;
  const pendingFilter = { status: 'Pending' };
  if (user.role === 'lead') pendingFilter.club = user.leadClub;
  if (user.role === 'student') pendingFilter.usn = user.usn || '-';

  const [clubs, activeClubs, members, upcomingEvents, pendingRequests, notices] = await Promise.all([
    Club.countDocuments(),
    Club.countDocuments({ isActive: true }),
    Member.countDocuments(),
    Event.countDocuments({ status: 'Upcoming', date: { $gte: startOfToday() } }),
    JoinRequest.countDocuments(pendingFilter),
    Announcement.countDocuments(),
  ]);

  let myClubs = 0;
  let myUpcoming = 0;
  if (user.usn) {
    const [count, regs] = await Promise.all([
      Member.countDocuments({ usn: user.usn }),
      Registration.find({ usn: user.usn }).select('event'),
    ]);
    myClubs = count;
    myUpcoming = await Event.countDocuments({
      _id: { $in: regs.map((r) => r.event) }, status: 'Upcoming', date: { $gte: startOfToday() },
    });
  }

  res.json({ clubs, activeClubs, members, upcomingEvents, pendingRequests, notices, myClubs, myUpcoming });
}));

module.exports = router;
