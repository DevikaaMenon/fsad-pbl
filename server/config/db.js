// Connects to MongoDB through Mongoose and logs connection events.
const mongoose = require('mongoose');
const config = require('./env');

mongoose.connection.on('connected', () => console.log('MongoDB connected'));
mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));

function connectDB(uri = config.MONGO_URI) {
  // Fail fast (5 s) instead of hanging when MongoDB is not running.
  return mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
}

function disconnectDB() {
  return mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
