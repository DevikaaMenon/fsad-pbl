# ClubHub

A club management app for RVCE student activities, built with the MERN stack (MongoDB, Express, React, Node.js) for the Full Stack Application Development (MCA261IA) PBL.

## Features

- **Clubs** – browse, search and manage clubs
- **Members** – add members and assign roles
- **Events** – event calendar, registrations and attendance
- **Notice board** – club announcements, with pinned notices on top
- **Join requests** – students apply to join a club, and leads approve or reject
- **Reports** – semester reports per club (members, events, attendance, budget)
- **Login and roles** – Admin, Club lead and Student, each with different permissions

## Getting started

You need **Node.js 18+** and **MongoDB** running on `localhost:27017`.

```bash
npm run setup        # install packages
npm run seed         # add sample data
npm run dev:server   # start the API (port 4000)
npm run dev:client   # start the app, then open http://localhost:5173
```

Run the tests with `npm test`.

## Project structure

```
server/   Express + Mongoose API (models, routes, middleware, tests)
client/   React frontend (pages, components, hooks)
```
