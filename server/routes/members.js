const express = require('express');
const Member = require('../models/Member');
const Club = require('../models/Club');
const appEvents = require('../utils/appEvents');
const asyncHandler = require('../utils/asyncHandler');
const { createError, pick, escapeRegex } = require('../utils/http');
const { canManageClub, assertCanManage } = require('../middleware/auth');

const router = express.Router();
const FIELDS = ['name', 'usn', 'email', 'role', 'club', 'joinedOn'];

async function ensureClubExists(clubId) {
  if (!clubId) return;
  const exists = await Club.exists({ _id: clubId });
  if (!exists) throw createError(400, 'The selected club does not exist');
}

function duplicateMember(err) {
  if (err.code === 11000) {
    return createError(409, 'This student is already a member of that club', { usn: 'Already in this club' });
  }
  return err;
}

// GET /api/members?club=<id>&role=President&q=ana
// admins see everyone, leads see their club, students only their own memberships (?mine=true)
router.get('/', asyncHandler(async (req, res) => {
  const { club, role, q, mine } = req.query;
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
  if (role) filter.role = String(role);
  if (q) {
    const rx = { $regex: escapeRegex(String(q)), $options: 'i' };
    filter.$or = [{ name: rx }, { usn: rx }];
  }
  const members = await Member.find(filter).sort({ name: 1 });
  res.json(members);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) throw createError(404, 'Member not found');
  if (!canManageClub(req.user, member.club) && member.usn !== req.user.usn) {
    throw createError(403, "You don't have permission to see this member");
  }
  res.json(member);
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.club && req.user.role === 'lead') data.club = req.user.leadClub;
  if (data.club) assertCanManage(req.user, data.club);
  else if (req.user.role !== 'admin') throw createError(403, "You don't have permission to do that");
  await ensureClubExists(data.club);
  const member = await Member.create(data).catch((err) => { throw duplicateMember(err); });
  appEvents.emit('member:joined', member);
  res.status(201).json(member);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) throw createError(404, 'Member not found');
  assertCanManage(req.user, member.club);
  const data = pick(req.body, FIELDS);
  if (data.club && String(data.club) !== String(member.club)) {
    assertCanManage(req.user, data.club);
    await ensureClubExists(data.club);
  }
  Object.assign(member, data);
  await member.save().catch((err) => { throw duplicateMember(err); });
  res.json(member);
}));

// managers can remove anyone from their club; a student can leave a club
router.delete('/:id', asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) throw createError(404, 'Member not found');
  const self = req.user.usn && member.usn === req.user.usn;
  if (!self) assertCanManage(req.user, member.club);
  await member.deleteOne();
  res.status(204).end();
}));

module.exports = router;
