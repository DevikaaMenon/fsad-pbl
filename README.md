# ClubHub

Club management for RVCE student activities: clubs, members, events with registrations and attendance, a campus notice board, join requests, and semester reports. MERN stack, built for the Full Stack Application Development (MCA261IA) PBL.

## Run it

You need Node.js 18+ and MongoDB Community Server running on `localhost:27017`.

```bash
npm run setup        # install server + client packages
npm run seed         # sample data + demo accounts (see below)
npm run dev:server   # terminal 1: API on :4000
npm run dev:client   # terminal 2: open http://localhost:5173
```

One-server production run:

```bash
npm run build && npm start     # http://localhost:4000
```

Tests (17 API tests, including login and role checks; they use an in-memory MongoDB so your data is untouched):

```bash
npm test
```

Settings go in `server/.env` (see `server/.env.example`): `PORT`, `MONGO_URI`, `CORS_ORIGIN`, `JWT_SECRET`, `TOKEN_DAYS`. **`JWT_SECRET` is required when `NODE_ENV=production`.**

## Accounts and roles

> Authentication is an extension beyond the MCA261IA syllabus, added on request.

| Demo login (password `clubhub123`) | Role | Can do |
| --- | --- | --- |
| `admin@rvce.edu.in` | Admin | Everything: create/delete clubs, all members, events, notices and requests, reports, user management (promote students to club lead) |
| `arjun.das@rvce.edu.in` | Club lead (Coding Club) | Edit their club; manage its members, events, attendance, notices and join requests |
| `ananya.sharma@rvce.edu.in` | Club lead (Debate Society) | Same, for Debate Society |
| `priya.menon@rvce.edu.in` | Student | Browse clubs, events and notices; register / cancel for events; ask to join or leave clubs; see own requests |

Anyone can sign up at `/register`; new accounts are students. The login page shows one-click demo logins; set `VITE_SHOW_DEMO=false` when building to hide them.

How it works:
- Passwords are hashed with Node's built-in `crypto.scrypt` (random salt, constant-time comparison). Hashes are never sent to the client.
- Logging in sets a signed JWT in an **httpOnly, SameSite=Lax** cookie (`Secure` in production), so page scripts can't read it and cross-site form posts don't carry it.
- `middleware/auth.js` loads the user on every request; `requireAuth`, `requireRole('admin')` and `assertCanManage(user, clubId)` guard routes. Every rule is enforced on the server; the React UI only hides what you can't use.
- Five failed logins for the same email from the same IP lock that pair out for 15 minutes.
- Students' registrations and join requests always use the name/USN from their account, never from the request body.

## What it does

- **Clubs:** directory with category chips and search, club pages with Overview / Members / Events / Notices / Requests tabs. Deleting a club removes everything under it.
- **Members:** a student can belong to several clubs (once per club). Change roles inline from the table.
- **Events:** month-by-month calendar, seat limits, and a registration desk on each event page. Tick attendance after the event; registrations close when an event is full, completed or cancelled.
- **Notice board:** club notices, pinned ones stay on top.
- **Join requests:** students apply from a club's join form; approving a request adds them as a member.
- **Reports:** members, events held, registrations, attendance rate and budget per club, filtered by date range and category. Printable.

## API

Everything except `/api/auth/*` and `/api/health` needs a login.

| Resource | Endpoints | Filters / notes |
| --- | --- | --- |
| Auth | `POST /api/auth/register`, `/login`, `/logout`; `GET/PUT /api/auth/me`; `PUT /api/auth/password` | public: register, login |
| Users | `GET /api/users`, `PUT/DELETE /api/users/:id` | admin only; `role`, `q` |
| Clubs | `GET/POST /api/clubs`, `GET/PUT/DELETE /api/clubs/:id` | `category`, `active`, `q` |
| Members | `GET/POST /api/members`, `GET/PUT/DELETE /api/members/:id` | `club`, `role`, `q`, `mine=true` |
| Events | `GET/POST /api/events`, `GET/PUT/DELETE /api/events/:id` | `club`, `status`, `when=upcoming\|past` |
| Registrations | `GET/POST /api/registrations`, `PUT/DELETE /api/registrations/:id` | `event` (managers), `mine=true` |
| Notices | `GET/POST /api/announcements`, `GET/PUT/DELETE /api/announcements/:id` | `club`, `pinned`, `limit` |
| Join requests | `GET/POST /api/requests`, `GET/PUT/DELETE /api/requests/:id` | `club`, `status`, `mine=true` |
| Reports | `GET /api/reports` | admin only; `from`, `to`, `category` |
| Other | `GET /api/stats`, `GET /api/health` | |

Errors come back as JSON `{ error, details? }` with 400 (validation, bad id, bad JSON), 401 (not logged in), 403 (not allowed), 404, 409 (duplicate, event full, already decided), 413, 429 (too many logins) or 500.

## Project layout

```
server/
  app.js, server.js        Express app, startup, graceful shutdown
  config/                  .env loader, Mongo connection
  models/                  User, Club, Member, Event, Registration, Announcement, JoinRequest
  routes/                  auth, users, one router per resource, reports, stats
  middleware/              auth (JWT cookie, role checks), request logger, error handler
  utils/                   password hashing, login limiter, EventEmitter, asyncHandler, helpers
  test/api.test.js         node:test suite
  seed.js
client/src/
  App.jsx                  login state + route table (guards, nested routes under /clubs/:id)
  api.js, lib/             fetch wrapper + auth calls; formatting; permission helpers
  hooks/                   useClubs, useConfirm (confirm dialog)
  components/              Layout (role-based sidebar, toasts), Guards, FilterForm, Field, MemberTable, cards, icons
  pages/                   auth/, clubs/, events/, members/, notices/, requests/, reports/, users/
```

## Syllabus map

| Topic | Where |
| --- | --- |
| Node: events, core modules, npm | `utils/appEvents.js` (EventEmitter), `config/env.js` + `middleware/logger.js` (fs, path), `server.js` (process signals), npm scripts |
| Express: routing, req/res, middleware, errors | `app.js`, `routes/*`, `middleware/errorHandler.js`, `cors`, `express.static` |
| Mongoose: schemas, defaults, modifiers, getters/setters | `models/*`: `trim`, `lowercase`, `uppercase`, `enum`, `min`/`max`, `match`, `default`; `titleCase` setter; `budget` rupees↔paise getter/setter; date getters |
| MongoDB CRUD | `insertMany`, `create`, `save`, `find`, `findOne`, `findById`, `findByIdAndDelete`, `deleteMany`, `countDocuments` |
| React: components, props, PropTypes, children, state | every component has PropTypes; `Field` / `ErrorBoundary` take children; `Bits.jsx` components are stateless |
| Child → parent | `Login.onLogin` → `App`, `FilterForm.onApply`, `MemberTable.onRoleChange/onDelete`, `RequestCard.onDecide`, `RegisterForm.onRegistered` |
| React Router | nested routes (`/clubs/:id/*`), route guards (`RequireAuth`, `RequireRole`), redirect back after login (`location.state`), `useParams`, `useSearchParams` filters, `useNavigate`, `<Outlet context>` |
| Forms | create/edit forms for clubs, members, events, notices; join form; registration form; filter forms |
