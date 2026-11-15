const express = require('express');
const Announcement = require('../models/Announcement');
const Club = require('../models/Club');
const asyncHandler = require('../utils/asyncHandler');
const { createError, pick } = require('../utils/http');
const { assertCanManage } = require('../middleware/auth');

const router = express.Router();
const FIELDS = ['club', 'title', 'body', 'pinned'];

// GET /api/announcements?club=<id>&pinned=true&limit=5   (everyone can read)
router.get('/', asyncHandler(async (req, res) => {
  const { club, pinned, limit } = req.query;
  const filter = {};
  if (club) filter.club = String(club);
  if (pinned === 'true') filter.pinned = true;
  let query = Announcement.find(filter).sort({ pinned: -1, createdAt: -1 });
  const n = parseInt(limit, 10);
  if (n > 0) query = query.limit(Math.min(n, 100));
  res.json(await query);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const notice = await Announcement.findById(req.params.id);
  if (!notice) throw createError(404, 'Notice not found');
  res.json(notice);
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.club && req.user.role === 'lead') data.club = req.user.leadClub;
  if (data.club) {
    assertCanManage(req.user, data.club);
    if (!(await Club.exists({ _id: data.club }))) throw createError(400, 'The selected club does not exist');
  } else if (req.user.role !== 'admin') {
    throw createError(403, "You don't have permission to do that");
  }
  const notice = await Announcement.create(data);
  res.status(201).json(notice);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const notice = await Announcement.findById(req.params.id);
  if (!notice) throw createError(404, 'Notice not found');
  assertCanManage(req.user, notice.club);
  const data = pick(req.body, FIELDS);
  if (data.club && String(data.club) !== String(notice.club)) {
    assertCanManage(req.user, data.club);
    if (!(await Club.exists({ _id: data.club }))) throw createError(400, 'The selected club does not exist');
  }
  Object.assign(notice, data);
  await notice.save();
  res.json(notice);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const notice = await Announcement.findById(req.params.id);
  if (!notice) throw createError(404, 'Notice not found');
  assertCanManage(req.user, notice.club);
  await notice.deleteOne();
  res.status(204).end();
}));

module.exports = router;
