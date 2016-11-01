// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log(`ERROR: ${reason}`);
  res.status(code || 500).json({ error: message });
}

class HttpError extends Error {
  constructor(message, code = 500) {
    super(message);
    this.statusCode = code;
  }
}

exports.handleError = handleError;
exports.HttpError = HttpError;
