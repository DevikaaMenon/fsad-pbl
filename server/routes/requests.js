const express = require('express');
const JoinRequest = require('../models/JoinRequest');
const Club = require('../models/Club');
const Member = require('../models/Member');
const appEvents = require('../utils/appEvents');
const asyncHandler = require('../utils/asyncHandler');
const { createError } = require('../utils/http');
const { canManageClub, assertCanManage } = require('../middleware/auth');

const router = express.Router();

// GET /api/requests?club=<id>&status=Pending
// admins: all, leads: their club, students (or ?mine=true): their own
router.get('/', asyncHandler(async (req, res) => {
  const { club, status, mine } = req.query;
  const user = req.user;
  const filter = {};
  if (mine === 'true' || user.role === 'student') {
    if (!user.usn) return res.json([]);
    filter.usn = user.usn;
  } else if (user.role === 'lead') {
    if (club && !canManageClub(user, club)) throw createError(403, 'Club leads can only see their own club');
    filter.club = user.leadClub;
  } else if (club) {
    filter.club = String(club);
  }
  if (status) filter.status = String(status);
  res.json(await JoinRequest.find(filter).sort({ createdAt: -1 }));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const request = await JoinRequest.findById(req.params.id);
  if (!request) throw createError(404, 'Request not found');
  if (!canManageClub(req.user, request.club) && request.usn !== req.user.usn) {
    throw createError(403, "You don't have permission to see this request");
  }
  res.json(request);
}));

// a student asks to join; name/USN/email come from their account
router.post('/', asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user.usn) throw createError(400, 'Add your USN to your profile before applying to a club');
  const request = new JoinRequest({
    club: req.body.club, message: req.body.message, name: user.name, usn: user.usn, email: user.email,
  });
  await request.validate();

  const club = await Club.findById(request.club);
  if (!club) throw createError(400, 'The selected club does not exist');
  if (!club.isActive) throw createError(400, `${club.name} is not taking new members right now`);
  if (await Member.exists({ club: club._id, usn: user.usn })) {
    throw createError(409, `You're already a member of ${club.name}`);
  }
  if (await JoinRequest.exists({ club: club._id, usn: user.usn, status: 'Pending' })) {
    throw createError(409, 'You already have a pending request for this club');
  }
  await request.save();
  res.status(201).json(request);
}));

// approve or reject: PUT /api/requests/:id  { status: 'Approved' | 'Rejected' }
router.put('/:id', asyncHandler(async (req, res) => {
  const request = await JoinRequest.findById(req.params.id);
  if (!request) throw createError(404, 'Request not found');
  assertCanManage(req.user, request.club);
  const { status } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) {
    throw createError(400, 'Status must be Approved or Rejected', { status: 'Choose Approved or Rejected' });
  }
  if (request.status !== 'Pending') throw createError(409, `This request was already ${request.status.toLowerCase()}`);

  if (status === 'Approved' && !(await Member.exists({ club: request.club, usn: request.usn }))) {
    const member = await Member.create({
      name: request.name, usn: request.usn, email: request.email, club: request.club, role: 'Member',
    });
    appEvents.emit('member:joined', member);
  }
  request.status = status;
  request.decidedAt = new Date();
  await request.save();
  res.json(request);
}));

// managers can clear decided requests; a student can withdraw a pending one
router.delete('/:id', asyncHandler(async (req, res) => {
  const request = await JoinRequest.findById(req.params.id);
  if (!request) throw createError(404, 'Request not found');
  const own = req.user.usn && request.usn === req.user.usn;
  if (!canManageClub(req.user, request.club)) {
    if (!own) throw createError(403, "You don't have permission to do that");
    if (request.status !== 'Pending') throw createError(400, 'Only pending requests can be withdrawn');
  }
  await request.deleteOne();
  res.status(204).end();
}));

module.exports = router;
