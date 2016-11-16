const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongodb = require('mongodb');
const jwt = require('express-jwt');

const auth = require('./middleware/auth');
const routes = require('./routes/index');

/**
 * Database Schema
 * // PINS
 * {
 *   "_id": <ObjectId>
 *   "rating": <string>,
 *   "pinType": <int>,
 *   "name": <string>,
 *   "cost": <int>,
 *   "review": <string>,
 *   "description": <string>,
 *   "image": <string>,
 *   "likes" : <int>,
 *   "duration": <long>,
 *   "coordinate": {
 *     "latitude": <double>,
 *     "longitude": <double>
 *   },
 *   "linkedAccount": <ObjectId>,
 *   likedBy: [<ObjectId>],
 *   dislikedBy: [<ObjectId>],
 *   "comments": [
 *     {
 *       "linkedAccount": <ObjectId>,
 *       "text": <string>,
 *       "date": <DateTime>
 *     },
 *     {
 *       "linkedAccount": <ObjectId>,
 *       "text": <string>,
 *       "date": <DateTime>
 *     } ...
 *   ]
 * }
 *
 * //ACCOUNTS
 * {
 *   "_id": <ObjectId>,
 *   "token": <string>,
 *   "username": <string>,
 *   "seeds": <double>,
 *   "pins": <int>
 * }
 */

// Initialize the app.
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Auth credentials for Google Sign-in
const authOpts = {
  clientId: process.env.AUTH_CLIENT_ID,
  clientSecret: process.env.AUTH_CLIENT_SECRET,
  audience: process.env.AUTH_AUDIENCE,
};

// -------------- DATABASE SET UP ------------------------------
// Create a database variable outside of the database connection callback
// to reuse the connection pool in your app.
// Connect to the database before starting the application server.
const connString = process.env.MONGO_URI;
exports.connect = (connPort = 8080) =>
  mongodb.MongoClient.connect(connString)
    .then((db) => {
      // Save database object from the callback for reuse.
      console.log('Database connection ready');

      // Routes
      app.use('/api', routes(db, auth(authOpts)));

      const server = app.listen(process.env.PORT || connPort, () => {
        const port = server.address().port;
        console.log('App now running on port', port);
      });

      return {
        app, db,
      };
    }, (err) => {
      console.log(err);
      process.exit(1);
    });
