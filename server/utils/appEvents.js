// Node's event-driven model: routes emit events, listeners react to them.
const EventEmitter = require('events');
const config = require('../config/env');

const appEvents = new EventEmitter();
const log = config.NODE_ENV === 'test' ? () => {} : (msg) => console.log(`[event] ${msg}`);

appEvents.on('club:created', (club) => log(`New club created: ${club.name}`));
appEvents.on('club:deleted', (club) => log(`Club deleted: ${club.name}`));
appEvents.on('member:joined', (member) => log(`${member.name} joined as ${member.role}`));

module.exports = appEvents;
