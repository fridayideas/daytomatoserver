const express = require('express');
const ObjectID = require('mongodb').ObjectID;
const utils = require('../utils');

const PINS_COLLECTION = 'pins';
const ACCOUNTS_COLLECTION = 'accounts';

const router = new express.Router();

module.exports = (db, auth) => {
  router.use(auth);

  // GET current authenticated user (stateless + uses token)
  // TODO a better name for this?
  router.get('/currentuser', (req, res) => {
    db.collection(ACCOUNTS_COLLECTION)
      .findOne({ auth0Id: req.user.sub }).then((result) => {
        if (!result) {
          db.collection(ACCOUNTS_COLLECTION).insertOne({
            auth0Id: req.user.sub,
            username: req.user.name,
            createDate: new Date(),
            numSeeds: 0,
            numPins: 0,
          }).then((created) => {
            const account = created.ops[0];
            delete account.auth0Id;
            res.status(200).json(account);
          });
        } else {
          res.status(200).json(result);
        }
      }).catch((err) => {
        utils.handleError(res, err.message, 'Failed to get account.', 404);
      });
  });

  router.get('/:id', (req, res) => {
    db.collection(ACCOUNTS_COLLECTION)
      .findOne({ _id: new ObjectID(req.params.id) }, (err, result) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to get account.');
        } else {
          res.status(200).json(result);
        }
      });
  });

  // POST Account
  router.post('/', (req, res) => {
    const newAccount = req.body;
    newAccount.createDate = new Date();

    newAccount.numSeeds = 0;
    newAccount.numPins = 0;

    db.collection(ACCOUNTS_COLLECTION).insertOne(newAccount, (err, doc) => {
      if (err) {
        utils.handleError(res, err.message, 'Failed to create new account.');
      } else {
        res.status(201).json(doc.ops[0]);
      }
    });
  });

  // PUT Account Password
  router.put('/:id/password', (req, res) => {
    if (!req.body.password) {
      utils.handleError(res, 'Invalid user input', 'Must provide new password in request body.', 400);
    }

    const newPassword = req.body.password;
    db.collection(ACCOUNTS_COLLECTION).updateOne({ _id: new ObjectID(req.params.id) },
      { $set: { password: newPassword } },
      (err, doc) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to update seed amount for account');
        } else {
          res.status(204).end();
        }
      });
  });

  router.get('/', (req, res) => {
    db.collection(ACCOUNTS_COLLECTION).find()
      .toArray((err, docs) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to get accounts');
        } else {
          res.status(200).json(docs);
        }
      });
  });

  // get number of seeds from the account
  router.get('/:id/seeds', (req, res) => {
    db.collection(ACCOUNTS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) },
      (err, result) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to get account');
        } else {
          const newAccount = result;
          //    console.log(newAccount.numSeeds);
          res.status(200).json(newAccount.numSeeds);
        }
      });
  });


  // get number of pins from the account
  router.get('/:id/pins', (req, res) => {
    db.collection(ACCOUNTS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) },
      (err, result) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to get account');
        } else {
          const newAccount = result;
          console.log(newAccount.numPins);
          res.status(200).json(newAccount.numPins);
        }
      });
  });

  // update the number of pins from the account
  router.put('/:id/pins', (req, res) => {
    const updatePin = req.body;
    delete updatePin._id;

    db.collection(PINS_COLLECTION).updateOne({ _id: new ObjectID(req.params.id) },
      updatePin, (err, result) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to update the number of pins');
        } else {
          //  console.log(updatePin);
          res.status(204).end();
        }
      });
  });

  // update the number of seeds from the account
  router.put('/:id/seeds', (req, res) => {
    const updateSeed = req.body;
    delete updateSeed._id;

    db.collection(ACCOUNTS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) },
      (err, result) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to update the number of seeds');
        } else {
          // console.log(updateSeed);
          res.status(204).end();
        }
      });
  });

  //get all trip id's from myTrips
  router.route('/:id/mytrips').get((req, res) => {
    db.collection(ACCOUNTS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) },
      (err, result) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to get my trips');
        } else {
          const account = result;
          res.status(200).json(account.myTrips);
        }
      });

  //update myTrips to add or delete trip id's
  }).put((req, res) => {
    const updateMyTrips = req.body;
    delete updateMyTrips._id;

    db.collection(ACCOUNTS_COLLECTION).updateOne({ _id: new ObjectID(req.params.id) },
      updateMyTrips, (err, result) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to update myTrips');
        } else {
          res.status(204).end();
        }
      });
  });


  router.get('/token/:token', (req, res) => {
    console.log(req.params.token);
    db.collection(ACCOUNTS_COLLECTION).findOne({ token: parseInt(req.params.token, 10) },
      (err, doc) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to authenticate user');
          res.status(401).end();
        } else {
          res.status(200).json(doc);
        }
      });
  });

  router.delete('/:id', (req, res) => {
    db.collection(ACCOUNTS_COLLECTION).deleteOne({ _id: new ObjectID(req.params.id) },
      (err, result) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to delete account');
        } else {
          res.status(204).end();
        }
      });
  });

  // get all accounts
  // for testing
  router.get('/all/t', (req, res) => {
    db.collection(ACCOUNTS_COLLECTION).find()
      .toArray((err, docs) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to get pins.');
        } else {
          res.status(200).json(docs);
        }
      });
  });

  return router;
};
