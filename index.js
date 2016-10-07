const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongodb = require('mongodb');

const routes = require('./routes/index');

/**
 * Database Schema
 * // PINS
 * {
 *   "_id": <ObjectId>
 *   "rating": <string>,
 *   "pinType": <int>,
 *   "name": <string>,
 *   "description": <string>,
 *   "likes" : <int>,
 *   "duration": <long>,
 *   "coordinate": {
 *     "latitude": <double>,
 *     "longitude": <double>
 *   },
 *   "linkedAccount": <ObjectId>,
 *   likedBy: [<ObjectId>],
 *   dislikedBy: [<ObjectId>],
 *   "reviews": [
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

// -------------- DATABASE SET UP ------------------------------
// Create a database variable outside of the database connection callback
// to reuse the connection pool in your app.
// Connect to the database before starting the application server.
const connString = process.env.MONGO_URI;
mongodb.MongoClient.connect(connString, (err, database) => {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  console.log('Database connection ready');

  // Initialize the app.
  const app = express();
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(bodyParser.json());

  // Routes
  app.use('/api', routes(database));

  const server = app.listen(process.env.PORT || 8080, () => {
    const port = server.address().port;
    console.log('App now running on port', port);
  });
});

