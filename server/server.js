// Entry point: connect to MongoDB, start listening, and shut down cleanly.
const app = require('./app');
const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');

let server;

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error('Could not connect to MongoDB. Is the MongoDB service running?');
    console.error(err.message);
    process.exit(1);
  }
  server = app.listen(config.PORT, () => {
    console.log(`ClubHub running at http://localhost:${config.PORT} (${config.NODE_ENV})`);
  });
}

// Graceful shutdown: stop taking new requests, finish current ones, close the DB.
function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();
  const closeServer = server ? new Promise((resolve) => server.close(resolve)) : Promise.resolve();
  closeServer
    .then(() => disconnectDB())
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

process.on('SIGINT', () => shutdown('SIGINT')); // Ctrl+C
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

start();
