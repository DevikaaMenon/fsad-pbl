// 404 for unknown routes, then one place that turns every error into JSON.

function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Express recognises error-handling middleware by its four arguments.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Mongoose schema validation failed -> 400 with a message per field.
  if (err.name === 'ValidationError') {
    const details = {};
    Object.values(err.errors).forEach((e) => {
      details[e.path] = e.kind === 'enum' ? `${e.value} is not a valid ${e.path}` : e.message;
    });
    return res.status(400).json({ error: 'Validation failed', details });
  }
  // A malformed ObjectId or a value of the wrong type.
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid value for ${err.path}: ${err.value}` });
  }
  // Duplicate value on a unique field.
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    return res.status(409).json({ error: `${field} "${value}" already exists`, details: { [field]: 'Already exists' } });
  }
  // Malformed JSON body (thrown by express.json()).
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  const status = err.status || 500;
  if (status === 500) console.error(err);
  const body = { error: status === 500 ? 'Something went wrong on the server' : err.message };
  if (err.details && status < 500) body.details = err.details;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
