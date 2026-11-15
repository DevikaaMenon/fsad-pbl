// Custom middleware: logs every request to the console and to a daily file
// (logs/access-YYYY-MM-DD.log) using the core fs and path modules.
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

const quiet = config.NODE_ENV === 'test';
if (!quiet) fs.mkdirSync(config.LOG_DIR, { recursive: true });

function logger(req, res, next) {
  if (quiet) return next();
  const start = Date.now();
  // 'finish' fires once the response has been sent.
  res.on('finish', () => {
    const now = new Date();
    const line = `${now.toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`;
    console.log(line);
    const file = path.join(config.LOG_DIR, `access-${now.toISOString().slice(0, 10)}.log`);
    fs.appendFile(file, line + '\n', (err) => {
      if (err) console.error('Could not write access log:', err.message);
    });
  });
  next();
}

module.exports = logger;
