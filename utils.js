// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log(`ERROR: ${reason}`);
  res.status(code || 500).json({ error: message });
}

class HttpError extends Error {
  constructor(message, status = 500) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.status = status;
  }
}

exports.handleError = handleError;
exports.HttpError = HttpError;
