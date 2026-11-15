// API tests: node:test + an in-memory MongoDB. Run with `npm test`.
process.env.NODE_ENV = 'test';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const { connectDB, disconnectDB } = require('../config/db');
const Club = require('../models/Club');
const Member = require('../models/Member');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Announcement = require('../models/Announcement');
const JoinRequest = require('../models/JoinRequest');
const User = require('../models/User');
const { hashPassword } = require('../utils/password');
const loginLimiter = require('../utils/loginLimiter');

const MODELS = [Club, Member, Event, Registration, Announcement, JoinRequest, User];
const PASSWORD = 'secret123';
let mongod;
let server;
let base;

// a tiny client that remembers its login cookie
function client() {
  let cookie = '';
  return async function call(method, path, body) {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null, setCookie };
  };
}

async function account(fields) {
  return User.create({ passwordHash: await hashPassword(PASSWORD), ...fields });
}

async function loginAs(fields) {
  const user = await account(fields);
  const call = client();
  const res = await call('POST', '/auth/login', { email: user.email, password: PASSWORD });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return call;
}

let admin;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDB(mongod.getUri() + 'clubhub-test');
  await Promise.all(MODELS.map((M) => M.init()));
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://localhost:${server.address().port}/api`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await disconnectDB();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all(MODELS.map((M) => M.deleteMany({})));
  loginLimiter.reset();
  admin = await loginAs({ name: 'Admin', email: 'admin@test.in', role: 'admin' });
});

async function makeClub(extra = {}) {
  const res = await admin('POST', '/clubs', { name: 'debate society', coordinator: 'Dr. Rao', ...extra });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body;
}

async function makeEvent(club, extra = {}) {
  const res = await admin('POST', '/events', { title: 'Pitch Night', club: club._id, date: '2030-02-01', ...extra });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body;
}

// ---- auth ----

test('register, me, logout, login', async () => {
  const call = client();
  const reg = await call('POST', '/auth/register', { name: 'neha kapoor', email: 'Neha@Test.in', usn: '1rv9', password: 'abc12345' });
  assert.equal(reg.status, 201, JSON.stringify(reg.body));
  assert.equal(reg.body.user.role, 'student');
  assert.equal(reg.body.user.usn, '1RV9');
  assert.equal(reg.body.user.passwordHash, undefined, 'hash never sent');
  assert.match(reg.setCookie, /HttpOnly/i);

  assert.equal((await call('GET', '/auth/me')).body.user.email, 'neha@test.in');
  assert.equal((await call('POST', '/auth/logout')).status, 204);
  assert.equal((await client()('GET', '/auth/me')).body.user, null);

  const stored = await User.findOne({ email: 'neha@test.in' }).select('+passwordHash');
  assert.match(stored.passwordHash, /^scrypt:/);
  assert.equal((await call('POST', '/auth/login', { email: 'neha@test.in', password: 'abc12345' })).status, 200);
});

test('register validation and duplicates', async () => {
  const call = client();
  const bad = await call('POST', '/auth/register', { name: '', email: 'x', password: 'short' });
  assert.equal(bad.status, 400);
  for (const f of ['name', 'email', 'usn', 'password']) assert.ok(bad.body.details[f], `error for ${f}`);
  await call('POST', '/auth/register', { name: 'A', email: 'a@test.in', usn: 'U1', password: 'abc12345' });
  const dup = await client()('POST', '/auth/register', { name: 'B', email: 'a@test.in', usn: 'U1', password: 'abc12345' });
  assert.equal(dup.status, 409);
  assert.ok(dup.body.details.email && dup.body.details.usn);
});

test('wrong password is rejected and repeated failures are throttled', async () => {
  await account({ name: 'S', email: 's@test.in', usn: 'S1' });
  const call = client();
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await call('POST', '/auth/login', { email: 's@test.in', password: 'nope1234' })).status, 401);
  }
  assert.equal((await call('POST', '/auth/login', { email: 's@test.in', password: PASSWORD })).status, 429);
});

test('API needs a login; tampered tokens are ignored', async () => {
  assert.equal((await client()('GET', '/clubs')).status, 401);
  const res = await fetch(`${base}/clubs`, { headers: { Cookie: 'clubhub_token=not.a.token' } });
  assert.equal(res.status, 401);
  assert.equal((await client()('GET', '/health')).status, 200, 'health stays public');
});

test('change password', async () => {
  const call = await loginAs({ name: 'S', email: 's@test.in', usn: 'S1' });
  assert.equal((await call('PUT', '/auth/password', { currentPassword: 'wrong', newPassword: 'newpass123' })).status, 400);
  assert.equal((await call('PUT', '/auth/password', { currentPassword: PASSWORD, newPassword: 'weak' })).status, 400);
  assert.equal((await call('PUT', '/auth/password', { currentPassword: PASSWORD, newPassword: 'newpass123' })).status, 200);
  assert.equal((await client()('POST', '/auth/login', { email: 's@test.in', password: 'newpass123' })).status, 200);
});

// ---- roles ----

test('students cannot create clubs, events or see reports', async () => {
  const club = await makeClub();
  const student = await loginAs({ name: 'S', email: 's@test.in', usn: 'S1' });
  assert.equal((await student('GET', '/clubs')).status, 200, 'can browse');
  assert.equal((await student('POST', '/clubs', { name: 'X', coordinator: 'Y' })).status, 403);
  assert.equal((await student('PUT', `/clubs/${club._id}`, { description: 'hacked' })).status, 403);
  assert.equal((await student('POST', '/events', { title: 'E', club: club._id, date: '2030-01-01' })).status, 403);
  assert.equal((await student('GET', '/reports')).status, 403);
  assert.equal((await student('GET', '/users')).status, 403);
});

test('a club lead manages only their own club', async () => {
  const mine = await makeClub({ name: 'Coding Club' });
  const other = await makeClub({ name: 'Music Club' });
  const lead = await loginAs({ name: 'L', email: 'l@test.in', usn: 'L1', role: 'lead', leadClub: mine._id });

  assert.equal((await lead('PUT', `/clubs/${mine._id}`, { description: 'Our club' })).status, 200);
  assert.equal((await lead('PUT', `/clubs/${other._id}`, { description: 'x' })).status, 403);
  assert.equal((await lead('DELETE', `/clubs/${mine._id}`)).status, 403, 'only admins delete clubs');

  const ev = await lead('POST', '/events', { title: 'Hack', date: '2030-03-01' });
  assert.equal(ev.status, 201, 'club defaults to their own');
  assert.equal(ev.body.club, mine._id);
  assert.equal((await lead('POST', '/events', { title: 'X', club: other._id, date: '2030-03-01' })).status, 403);
  assert.equal((await lead('POST', '/announcements', { club: other._id, title: 't', body: 'b' })).status, 403);

  await admin('POST', '/members', { name: 'a', usn: 'U1', club: mine._id });
  await admin('POST', '/members', { name: 'b', usn: 'U2', club: other._id });
  const list = await lead('GET', '/members');
  assert.equal(list.body.length, 1, 'sees only own club');
  assert.equal((await lead('GET', `/members?club=${other._id}`)).status, 403);
});

test('admin manages users and assigns club leads', async () => {
  const club = await makeClub();
  const s = await account({ name: 'S', email: 's@test.in', usn: 'S1' });
  assert.equal((await admin('PUT', `/users/${s._id}`, { role: 'lead' })).status, 400, 'lead needs a club');
  const promoted = await admin('PUT', `/users/${s._id}`, { role: 'lead', leadClub: club._id });
  assert.equal(promoted.body.role, 'lead');
  assert.equal(promoted.body.leadClub, club._id);

  const me = (await admin('GET', '/auth/me')).body.user;
  assert.equal((await admin('PUT', `/users/${me._id}`, { role: 'student' })).status, 400, 'cannot demote self');
  assert.equal((await admin('DELETE', `/users/${me._id}`)).status, 400);

  await admin('DELETE', `/clubs/${club._id}`);
  const after = await User.findById(s._id);
  assert.equal(after.role, 'student', 'lead demoted when club is deleted');
});

// ---- clubs / members (as admin) ----

test('clubs: setters, defaults, validation, duplicates, filters, counts', async () => {
  const club = await makeClub({ name: '  debate   society ', email: 'DEBATE@College.EDU' });
  assert.equal(club.name, 'Debate Society');
  assert.equal(club.email, 'debate@college.edu');
  assert.equal(club.category, 'Technical');

  const bad = await admin('POST', '/clubs', { category: 'Gaming', email: 'abc', foundedYear: 3000 });
  assert.equal(bad.status, 400);
  for (const f of ['name', 'coordinator', 'category', 'email', 'foundedYear']) assert.ok(bad.body.details[f]);
  assert.equal((await admin('POST', '/clubs', { name: 'Debate Society', coordinator: 'X' })).status, 409);

  await makeClub({ name: 'Music Club', category: 'Cultural', isActive: false });
  await admin('POST', '/members', { name: 'a', usn: 'U1', club: club._id });
  const all = (await admin('GET', '/clubs')).body;
  assert.equal(all.find((c) => c.name === 'Debate Society').memberCount, 1);
  assert.equal((await admin('GET', '/clubs?active=false')).body[0].name, 'Music Club');
  assert.equal((await admin('GET', '/clubs/not-an-id')).status, 400);
  assert.equal((await admin('GET', '/clubs/000000000000000000000000')).status, 404);
});

test('members: one membership per club, students see and leave their own', async () => {
  const debate = await makeClub();
  const coding = await makeClub({ name: 'Coding Club' });
  const created = await admin('POST', '/members', { name: 'ananya sharma', usn: '1rv24mc001', club: debate._id, joinedOn: '2026-01-15' });
  assert.equal(created.body.name, 'Ananya Sharma');
  assert.equal(created.body.usn, '1RV24MC001');
  assert.equal(created.body.joinedOn, '2026-01-15');
  assert.equal((await admin('POST', '/members', { name: 'x', usn: '1RV24MC001', club: debate._id })).status, 409);
  assert.equal((await admin('POST', '/members', { name: 'x', usn: '1RV24MC001', club: coding._id })).status, 201);
  await admin('POST', '/members', { name: 'other', usn: 'ZZ9', club: coding._id });

  const student = await loginAs({ name: 'Ananya', email: 'an@test.in', usn: '1RV24MC001' });
  const mine = (await student('GET', '/members')).body;
  assert.equal(mine.length, 2, 'only their own memberships');
  assert.equal((await student('DELETE', `/members/${mine[0]._id}`)).status, 204, 'can leave');
  const someoneElse = await Member.findOne({ usn: 'ZZ9' });
  assert.equal((await student('DELETE', `/members/${someoneElse._id}`)).status, 403);
});

// ---- events + registrations ----

test('events: getter/setter, defaults, time format, myRegistration', async () => {
  const club = await makeClub();
  const ev = await makeEvent(club, { budget: 1234.56 });
  assert.equal(ev.budget, 1234.56);
  assert.equal(ev.venue, 'Seminar Hall');
  assert.equal(ev.capacity, 50);
  const stored = await Event.collection.findOne({ _id: new Event.base.Types.ObjectId(ev._id) });
  assert.equal(stored.budget, 123456);
  assert.equal((await admin('PUT', `/events/${ev._id}`, { time: '25:00' })).status, 400);
});

test('students register themselves, cancel, and see their events', async () => {
  const club = await makeClub();
  const ev = await makeEvent(club, { capacity: 2 });
  const student = await loginAs({ name: 'neha k', email: 'n@test.in', usn: '1RV1' });

  const reg = await student('POST', '/registrations', { event: ev._id, name: 'Fake Name', usn: 'OTHER' });
  assert.equal(reg.status, 201);
  assert.equal(reg.body.usn, '1RV1', 'uses account details, not the body');
  assert.equal(reg.body.name, 'Neha K');
  assert.equal((await student('POST', '/registrations', { event: ev._id })).status, 409);

  const detail = (await student('GET', `/events/${ev._id}`)).body;
  assert.equal(detail.myRegistration.usn, '1RV1');
  assert.equal((await student('GET', `/registrations?event=${ev._id}`)).status, 403, 'list is for managers');
  const mine = (await student('GET', '/registrations?mine=true')).body;
  assert.equal(mine[0].eventInfo.title, 'Pitch Night');
  assert.equal((await student('PUT', `/registrations/${reg.body._id}`, { attended: true })).status, 403);

  await admin('POST', '/registrations', { event: ev._id, name: 'b', usn: '1RV2' });
  const third = await loginAs({ name: 'c', email: 'c@test.in', usn: '1RV3' });
  assert.equal((await third('POST', '/registrations', { event: ev._id })).status, 409, 'full');

  assert.equal((await student('DELETE', `/registrations/${reg.body._id}`)).status, 204, 'cancel');
  assert.equal((await third('POST', '/registrations', { event: ev._id })).status, 201, 'seat freed');

  await admin('PUT', `/events/${ev._id}`, { status: 'Completed' });
  const r3 = await Registration.findOne({ usn: '1RV3' });
  assert.equal((await third('DELETE', `/registrations/${r3._id}`)).status, 400, 'too late to cancel');
  assert.equal((await admin('PUT', `/registrations/${r3._id}`, { attended: true })).body.attended, true);
});

// ---- notices ----

test('announcements: pinned first, everyone reads, managers write', async () => {
  const club = await makeClub();
  await admin('POST', '/announcements', { club: club._id, title: 'Old', body: 'x' });
  await admin('POST', '/announcements', { club: club._id, title: 'Pinned', body: 'x', pinned: true });
  await admin('POST', '/announcements', { club: club._id, title: 'New', body: 'x' });
  const student = await loginAs({ name: 'S', email: 's@test.in', usn: 'S1' });
  const list = (await student('GET', `/announcements?club=${club._id}`)).body;
  assert.deepEqual(list.map((n) => n.title), ['Pinned', 'New', 'Old']);
  assert.equal((await student('POST', '/announcements', { club: club._id, title: 't', body: 'b' })).status, 403);
  const bad = await admin('POST', '/announcements', { club: club._id });
  assert.ok(bad.body.details.title && bad.body.details.body);
});

// ---- join requests ----

test('join requests: student applies, lead approves, member is created', async () => {
  const club = await makeClub();
  const lead = await loginAs({ name: 'L', email: 'l@test.in', usn: 'L1', role: 'lead', leadClub: club._id });
  const student = await loginAs({ name: 'neha kapoor', email: 'n@test.in', usn: '1RV9' });

  const req1 = await student('POST', '/requests', { club: club._id, message: 'hi', usn: 'SPOOF' });
  assert.equal(req1.status, 201);
  assert.equal(req1.body.usn, '1RV9');
  assert.equal((await student('POST', '/requests', { club: club._id })).status, 409, 'already pending');
  assert.equal((await student('PUT', `/requests/${req1.body._id}`, { status: 'Approved' })).status, 403, 'cannot approve self');

  const approved = await lead('PUT', `/requests/${req1.body._id}`, { status: 'Approved' });
  assert.equal(approved.body.status, 'Approved');
  const members = (await admin('GET', `/members?club=${club._id}`)).body;
  assert.equal(members[0].name, 'Neha Kapoor');
  assert.equal((await student('POST', '/requests', { club: club._id })).status, 409, 'already a member');
  assert.equal((await student('GET', '/requests')).body.length, 1, 'sees own requests');
});

test('join requests: withdraw, inactive clubs, other leads', async () => {
  const club = await makeClub();
  const other = await makeClub({ name: 'Other Club' });
  const closed = await makeClub({ name: 'Closed Club', isActive: false });
  const student = await loginAs({ name: 'S', email: 's@test.in', usn: 'S1' });
  const otherLead = await loginAs({ name: 'O', email: 'o@test.in', usn: 'O1', role: 'lead', leadClub: other._id });

  assert.equal((await student('POST', '/requests', { club: closed._id })).status, 400);
  const r = await student('POST', '/requests', { club: club._id });
  assert.equal((await otherLead('PUT', `/requests/${r.body._id}`, { status: 'Approved' })).status, 403);
  assert.equal((await otherLead('GET', '/requests')).body.length, 0);
  assert.equal((await student('DELETE', `/requests/${r.body._id}`)).status, 204, 'withdraw');
});

// ---- reports + stats ----

test('reports: totals, attendance and date range', async () => {
  const club = await makeClub();
  await admin('POST', '/members', { name: 'a', usn: 'U1', club: club._id, role: 'President' });
  await admin('POST', '/members', { name: 'b', usn: 'U2', club: club._id });
  const done = await makeEvent(club, { date: '2026-09-10', budget: 1000 });
  await makeEvent(club, { date: '2026-12-01', budget: 500, title: 'Later' });
  const r1 = await admin('POST', '/registrations', { event: done._id, name: 'a', usn: 'U1' });
  await admin('POST', '/registrations', { event: done._id, name: 'b', usn: 'U2' });
  await admin('PUT', `/registrations/${r1.body._id}`, { attended: true });
  await admin('PUT', `/events/${done._id}`, { status: 'Completed' });

  const all = (await admin('GET', '/reports')).body;
  assert.deepEqual(all.clubs[0].membersByRole, { President: 1, Member: 1 });
  assert.equal(all.clubs[0].budget, 1500);
  assert.equal(all.clubs[0].attendanceRate, 50);
  const sept = (await admin('GET', '/reports?from=2026-09-01&to=2026-09-30')).body;
  assert.equal(sept.clubs[0].events, 1);
  assert.equal((await admin('GET', '/reports?from=09-2026')).status, 400);
});

test('stats are scoped to the user, and deleting a club cleans up', async () => {
  const club = await makeClub();
  const student = await loginAs({ name: 'S', email: 's@test.in', usn: 'S1' });
  await admin('POST', '/members', { name: 'a', usn: 'U1', club: club._id });
  const ev = await makeEvent(club);
  await student('POST', '/registrations', { event: ev._id });
  await student('POST', '/requests', { club: club._id });
  await admin('POST', '/announcements', { club: club._id, title: 't', body: 'b' });

  const s = (await student('GET', '/stats')).body;
  assert.equal(s.myUpcoming, 1);
  assert.equal(s.pendingRequests, 1);
  assert.equal((await admin('GET', '/stats')).body.pendingRequests, 1);

  await admin('DELETE', `/clubs/${club._id}`);
  const after = (await admin('GET', '/stats')).body;
  assert.equal(after.clubs + after.members + after.upcomingEvents + after.pendingRequests + after.notices, 0);
  assert.equal(await Registration.countDocuments(), 0);
});
