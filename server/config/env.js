// Loads server/.env (if present) with core modules, then exposes one config object.
// Real environment variables win over the file.
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env');

if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
      if (process.env[key] === undefined) process.env[key] = value;
    });
}

const NODE_ENV = process.env.NODE_ENV || 'development';

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production (put a long random string in server/.env)');
  }
  JWT_SECRET = 'dev-only-secret-do-not-use-in-production';
}

const config = {
  NODE_ENV,
  PORT: Number(process.env.PORT) || 4000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clubhub',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  LOG_DIR: process.env.LOG_DIR || path.join(__dirname, '..', 'logs'),
  JWT_SECRET,
  TOKEN_DAYS: Number(process.env.TOKEN_DAYS) || 7,
  COOKIE_NAME: 'clubhub_token',
};

module.exports = config;
