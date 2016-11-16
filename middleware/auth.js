const GoogleAuth = require('google-auth-library');
const HttpError = require('../utils').HttpError;

module.exports = ({ clientId, clientSecret, audience }) => {
  const authFactory = new GoogleAuth();
  const oAuthClient = new authFactory.OAuth2(clientId, clientSecret);

  return (req, res, next) => {
    if (req.headers && req.headers.authorization) {
      const components = req.headers.authorization.split(' ');
      if (components.length !== 2) {
        return next(new HttpError('Invalid Authorization header format', 401));
      }

      const [type, token] = components;
      if (type !== 'Bearer' || !token) {
        return next(new HttpError('Invalid id token format', 401));
      }

      return oAuthClient.verifyIdToken(token, audience, (err, login) => {
        if (err) {
          next(new HttpError(err.message, 401));
          return;
        }
        const payload = login.getPayload();
        Object.assign(req, { user: payload });
        next();
      });
    }
    return next(new HttpError('No Authorization header', 401));
  };
};
