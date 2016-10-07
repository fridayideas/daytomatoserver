const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongodb = require('mongodb');

const ObjectID = mongodb.ObjectID;

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

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Create a database variable outside of the database connection callback
// to reuse the connection pool in your app.
let db;

// Connect to the database before starting the application server.
const connString = process.env.MONGO_URI;
mongodb.MongoClient.connect(connString, (err, database) => {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
  console.log('Database connection ready');

  // Initialize the app.
  const server = app.listen(process.env.PORT || 8080, () => {
    const port = server.address().port;
    console.log('App now running on port', port);
  });
});

// -------------- PINS API BELOW -------------------------------

const PINS_COLLECTION = 'pins';
// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log(`ERROR: ${reason}`);
  res.status(code || 500).json({ error: message });
}

/**
 * "/pins"
 *   GET: finds all pins
 *     query params:
 *       searchArea (optional): a set of coordinates to search in. The format is
 *         `{topLeftLat},{topLeftLong},{bottomRightLat},{bottomRightLong}`, where:
 *         topLeftLat = latitude of the top left of the bounding box
 *         topLeftLong = longitude of the top left of the bounding box
 *         bottomRightLat = latitude of the bottom right of the bounding box
 *         bottomRightLong = longitude of the bottom right of the bounding box
 *   POST: creates a new pin
 */

const sortKeys = ['likes', 'createDate'];
app.route('/api/pins').get((req, res) => {
  const searchArea = (req.query.searchArea || '').split(',');
  const sortKey = req.query.sort || '';
  const limit = ~~req.query.limit;
  const filters = searchArea.length === 4 ? {
    $and: [
      { 'coordinate.latitude': { $lte: parseFloat(searchArea[0]) } },
      { 'coordinate.longitude': { $lte: parseFloat(searchArea[1]) } },
      { 'coordinate.latitude': { $gte: parseFloat(searchArea[2]) } },
      { 'coordinate.longitude': { $gte: parseFloat(searchArea[3]) } },
    ],
  } : {};
  const sort = sortKeys.includes(sortKey) ? {
    [sortKey]: 1,
  } : {};

  db.collection(PINS_COLLECTION)
    .find(filters)
    .sort(sort)
    .limit(limit)
    .toArray((err, docs) => {
      if (err) {
        handleError(res, err.message, 'Failed to get pins.');
      } else {
        res.status(200).json(docs);
      }
    });
}).post((req, res) => {
  const newPin = req.body;
  newPin.createDate = new Date();

  newPin.likes = req.body.likes || 0;
  newPin.reviews = req.body.reviews || [];
  if (!req.body.duration) {
    newPin.duration = -1; // Default duration, means never ending event (such as a park)
  }

  db.collection(PINS_COLLECTION).insertOne(newPin, (err, doc) => {
    if (err) {
      handleError(res, err.message, 'Failed to create new pin.');
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

/*  "/pins/:id"
 *    GET: find pin by id
 *    PUT: update pin by id
 *    DELETE: deletes pin by id
 */

app.route('/api/pins/:id').get((req, res) => {
  db.collection(PINS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) }, (err, doc) => {
    if (err) {
      handleError(res, err.message, 'Failed to get pin');
    } else {
      res.status(200).json(doc);
    }
  });
}).put((req, res) => {
  const updateDoc = req.body;
  delete updateDoc._id;

  db.collection(PINS_COLLECTION)
    .updateOne({ _id: new ObjectID(req.params.id) }, updateDoc, (err, doc) => {
      if (err) {
        handleError(res, err.message, 'Failed to update pin');
      } else {
        res.status(204).end();
      }
    });
}).delete((req, res) => {
  db.collection(PINS_COLLECTION).deleteOne({ _id: new ObjectID(req.params.id) }, (err, result) => {
    if (err) {
      handleError(res, err.message, 'Failed to delete pin');
    } else {
      res.status(204).end();
    }
  });
});

/**
 * "/pins/:topLeftLat/:topLeftLong/:bottomRightLat/:bottomRightLong"
 *   GET: Find pins inside specified coordinates.
 *     topLeftLat : latitude of the top left of the bounding box
 *     topLeftLong : longitude of the top left of the bounding box
 *     bottomRightLat : latitude of the bottom right of the bounding box
 *     bottomRightLong : longitude of the bottom right of the bounding box
 */

// POST "/pins/like/:id/
// Adds a like to the Pin ID

app.post('/api/pins/:id/likes', (req, res) => {
  const accountId = req.body.accountId;
  if (!accountId) {
    handleError(res, 'User id not provided', 'Invalid user id', 400);
    return;
  }

  db.collection(PINS_COLLECTION)
    .findOneAndUpdate({ _id: new ObjectID(req.params.id) }, {
      $addToSet: { likedBy: accountId },
      $pull: { dislikedBy: accountId },
      $inc: { likes: 1 },
    }, (err, doc) => {
      if (err) {
        handleError(res, err.message, 'Failed to update pin');
      } else {
        res.status(204).end();
      }
    });
});

// POST "/pins/dislikes/:id/
// Takes a like from the Pin ID

app.post('/api/pins/:id/dislikes', (req, res) => {
  const accountId = req.body.accountId;
  if (!accountId) {
    handleError(res, 'User id not provided', 'Invalid user id', 400);
    return;
  }

  db.collection(PINS_COLLECTION)
    .findOneAndUpdate({ _id: new ObjectID(req.params.id) }, {
      $addToSet: { dislikedBy: accountId },
      $pull: { likedBy: accountId },
      $inc: { likes: -1 },
    }, (err, doc) => {
      if (err) {
        handleError(res, err.message, 'Failed to update pin');
      } else {
        res.status(204).end();
      }
    });
});

// POST Review with Pin ID
app.post('/api/pins/:id/reviews', (req, res) => {
  const updateDoc = req.body;
  delete updateDoc._id;
  updateDoc.createDate = new Date();

  db.collection(PINS_COLLECTION)
    .updateOne({ _id: new ObjectID(req.params.id) }, { $push: { reviews: updateDoc } },
      (err, doc) => {
        if (err) {
          handleError(res, err.message, 'Failed to add review to pin');
        } else {
          res.status(204).end();
        }
      });
});

// DELETE Review with Pin ID & Account IDs
app.delete('/api/pins/:pinid/reviews/:accountid', (req, res) => {
  console.log(`Trying to remove from pin ${req.params.pinid} review from account ${req.params.accountid}`);

  db.collection(PINS_COLLECTION).update({ _id: new ObjectID(req.params.pinid) },
    { $pull: { reviews: { linkedAccount: parseInt(req.params.accountid, 10) } } },
    (err, doc) => {
      if (err) {
        handleError(res, err.message, 'Failed to remove review from pin');
      } else {
        res.status(204).end();
      }
    });
});

/**
 * body form:
 * { "text": "New review" }
 */
 // Updates review and sets createDate to new date
app.put('/api/pins/:pinid/reviews/:accountid', (req, res) => {
  db.collection(PINS_COLLECTION).findOneAndUpdate({ _id: new ObjectID(req.params.pinid),
  reviews: { $elemMatch: { linkedAccount: parseInt(req.params.accountid, 10) } } },
    { $set: { 'reviews.$.text': req.body.text, 'reviews.$.createDate': new Date() } },
    (err, doc) => {
      if (err) {
        handleError(res, err.message, 'Failed to update review from pin');
      } else {
        res.status(204).end();
      }
    });
});

// -------------- ACCOUNT API BELOW -------------------------
const ACCOUNTS_COLLECTION = 'accounts';
// GET Account

app.get('/api/accounts/:id', (req, res) => {
  db.collection(ACCOUNTS_COLLECTION)
    .findOne({ _id: new ObjectID(req.params.id) }, (err, result) => {
      if (err) {
        handleError(res, err.message, 'Failed to get account.');
      } else {
        res.status(200).json(result);
      }
    });
});

// POST Account
app.post('/api/accounts', (req, res) => {
  const newAccount = req.body;
  newAccount.createDate = new Date();

  newAccount.numSeeds = 0;
  newAccount.numPins = 0;

  db.collection(ACCOUNTS_COLLECTION).insertOne(newAccount, (err, doc) => {
    if (err) {
      handleError(res, err.message, 'Failed to create new account.');
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

// PUT Account Password
app.put('/api/accounts/:id/password', (req, res) => {
  if (!req.body.password) {
    handleError(res, 'Invalid user input', 'Must provide new password in request body.', 400);
  }

  const newPassword = req.body.password;
  db.collection(ACCOUNTS_COLLECTION).updateOne({ _id: new ObjectID(req.params.id) },
    { $set: { password: newPassword } },
    (err, doc) => {
      if (err) {
        handleError(res, err.message, 'Failed to update seed amount for account');
      } else {
        res.status(204).end();
      }
    });
});

app.get('/api/accounts/', (req, res) => {
  db.collection(ACCOUNTS_COLLECTION).find()
    .toArray((err, docs) => {
      if (err) {
        handleError(res, err.message, 'Failed to get accounts');
      } else {
        res.status(200).json(docs);
      }
    });
});

// get number of seeds from the account
app.get('/api/accounts/:id/seeds', (req, res) => {
  db.collection(ACCOUNTS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) },
    (err, result) => {
      if (err) {
        handleError(res, err.message, 'Failed to get account');
      } else {
        const newAccount = result;
        //    console.log(newAccount.numSeeds);
        res.status(200).json(newAccount.numSeeds);
      }
    });
});


// get number of pins from the account
app.get('/api/accounts/:id/pins', (req, res) => {
  db.collection(ACCOUNTS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) },
    (err, result) => {
      if (err) {
        handleError(res, err.message, 'Failed to get account');
      } else {
        const newAccount = result;
        console.log(newAccount.numPins);
        res.status(200).json(newAccount.numPins);
      }
    });
});

// update the number of pins from the account
app.put('/api/accounts/:id/pins', (req, res) => {
  const updatePin = req.body;
  delete updatePin._id;

  db.collection(PINS_COLLECTION).updateOne({ _id: new ObjectID(req.params.id) },
    updatePin, (err, result) => {
      if (err) {
        handleError(res, err.message, 'Failed to update the number of pins');
      } else {
        //  console.log(updatePin);
        res.status(204).end();
      }
    });
});

// update the number of seeds from the account
app.put('/api/accounts/:id/seeds', (req, res) => {
  const updateSeed = req.body;
  delete updateSeed._id;

  db.collection(ACCOUNTS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) },
    (err, result) => {
      if (err) {
        handleError(res, err.message, 'Failed to update the number of seeds');
      } else {
        // console.log(updateSeed);
        res.status(204).end();
      }
    });
});

app.get('/api/accounts/token/:token', (req, res) => {
  console.log(req.params.token);
  db.collection(ACCOUNTS_COLLECTION).findOne({ token: parseInt(req.params.token, 10) },
    (err, doc) => {
      if (err) {
        handleError(res, err.message, 'Failed to authenticate user');
        res.status(401).end();
      } else {
        res.status(200).json(doc);
      }
    });
});

app.delete('/api/accounts/:id', (req, res) => {
  db.collection(ACCOUNTS_COLLECTION).deleteOne({ _id: new ObjectID(req.params.id) },
    (err, result) => {
      if (err) {
        handleError(res, err.message, 'Failed to delete account');
      } else {
        res.status(204).end();
      }
    });
});
