const express = require('express');
const ObjectID = require('mongodb').ObjectID;
const utils = require('../utils');

const PINS_COLLECTION = 'pins';
const ACCOUNTS_COLLECTION = 'accounts';
const TRIPS_COLLECTION = 'trips';

const router = new express.Router();

module.exports = (db) => {
  function pinInfoForTrip(trip) {
    const pinIds = trip.pins.map(ObjectID);
    return db.collection(PINS_COLLECTION)
      .find({ _id: { $in: pinIds } }).toArray()
      .then(pins => Object.assign({}, trip, { pins }));
  }

  router.route('/').get((req, res) => {
    const filterKeys = ['type', 'cost', 'linkedAccount'];
    const sortKeys = ['rating', 'cost', 'createDate', 'likes', 'name'];
    const sortKey = (req.query.sort || '').split(',');
    const limit = ~~req.query.limit;
    const keys = [];
    for (const i of Object.keys(req.query)) {
      if (i === 'linkedAccount') {
        keys.push({ [i]: req.query[i] });
        keys.push({ [i]: { $exists: true } });
      } else if (i === 'cost') {
        const c = (req.query.cost).split(',');
        keys.push({
          $and: [
            { cost: { $lte: parseInt(c[1], 10) } },
            { cost: { $gte: parseInt(c[0], 10) } },
          ],
        });
        keys.push({ [i]: { $exists: true } });
      } else if (i !== 'sort' && i !== 'limit') {
        keys.push({ [i]: parseInt(req.query[i], 10) });
        keys.push({ [i]: { $exists: true } });
      }
    }

    const filters = keys.length > 0 ? { $and: keys } : {};
    const sort = sortKeys.includes(sortKey[0]) ? {
      [sortKey[0]]: parseInt(sortKey[1], 10),
    } : {};

    db.collection(TRIPS_COLLECTION)
      .find(filters)
      .sort(sort)
      .limit(limit)
      .toArray((err, docs) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to get trips');
        } else {
          Promise.all(docs.map(pinInfoForTrip))
            .then(trips => res.status(200).json(trips));
        }
      });
  }).post((req, res) => {
    const newTrip = req.body;
    newTrip.createDate = new Date();
    newTrip.likes = 0;
    newTrip.pins = newTrip.pins.map(ObjectID);

    db.collection(TRIPS_COLLECTION).insertOne(newTrip, (err, doc) => {
      if (err) {
        utils.handleError(res, err.message, 'Failed to create new trip.');
      } else {
        res.status(201).json(doc.ops[0]);
      }
    });
  });

  router.route('/:id').get((req, res) => {
    db.collection(TRIPS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) }, (err, doc) => {
      if (err) {
        utils.handleError(res, err.message, 'Failed to get trip');
      } else {
        pinInfoForTrip(doc).then(trip => res.status(200).json(trip));
      }
    });
  }).put((req, res) => {
    const updateDoc = req.body;
    delete updateDoc._id;

    db.collection(TRIPS_COLLECTION)
      .updateOne({ _id: new ObjectID(req.params.id) }, updateDoc, (err, doc) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to update trip');
        } else {
          res.status(204).end();
        }
      });
  }).delete((req, res) => {
    db.collection(TRIPS_COLLECTION)
      .deleteOne({ _id: new ObjectID(req.params.id) }, (err, result) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to delete pin');
        } else {
          res.status(204).end();
        }
      });
  });

  router.post('/:id/likes', (req, res) => {
    const accountId = req.body.accountId;
    if (!accountId) {
      utils.handleError(res, 'User id not provided', 'Invalid user id', 400);
      return;
    }

    db.collection(ACCOUNTS_COLLECTION).findOne({ _id: new ObjectID(accountId) })
      .then(doc => doc.username)
      .then(usernmlikedby =>
        db.collection(TRIPS_COLLECTION)
          .findOneAndUpdate({ _id: new ObjectID(req.params.id) }, {
            $addToSet: { likedBy: accountId },
            $pull: { dislikedBy: accountId },
            $inc: { likes: 1 },
          }).then(doc => [doc, usernmlikedby]))
      .then(([doc, usernmlikedby]) =>
          db.collection(ACCOUNTS_COLLECTION)
            .findOneAndUpdate({
              _id: new ObjectID(doc.value.linkedAccount),
            }, {
              $push: {
                feed: { $each: [`${usernmlikedby} liked your trip ${doc.value.name}`],
                  $slice: 5,
                  $position: 0,
                },
              },
            })
            .then(() => {
              res.status(204).end();
            }, (err) => {
              utils.handleError(res, err.message, 'Failed to update feed');
            }),
        (err) => {
          utils.handleError(res, err.message, 'Failed to add like to trip');
        });
  });

  router.post('/:id/dislikes', (req, res) => {
    const accountId = req.body.accountId;
    let usernmdislikedby = '';
    if (!accountId) {
      utils.handleError(res, 'User id not provided', 'Invalid user id', 400);
      return;
    }

    db.collection(ACCOUNTS_COLLECTION).findOne({ _id: new ObjectID(accountId) },
      (err, doc) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to find account of user disliking trip');
        } else {
          usernmdislikedby = doc.username;
        }
      });

    db.collection(TRIPS_COLLECTION)
      .findOneAndUpdate({ _id: new ObjectID(req.params.id) }, {
        $addToSet: { dislikedBy: accountId },
        $pull: { likedBy: accountId },
        $inc: { likes: -1 },
      }, (err, doc) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to add dislike to trip');
        } else {
          db.collection(ACCOUNTS_COLLECTION).findOneAndUpdate({
            _id: new ObjectID(doc.value.linkedAccount),
          }, {
            $push: {
              feed: { $each: [`${usernmdislikedby} disliked your trip ${doc.value.name}`],
                $slice: 5,
                $position: 0,
              },
            },
          }, (err1, _) => {
            if (err) {
              utils.handleError(res, err1.message, 'Failed to update feed');
            } else {
              res.status(204).end();
            }
          });
          res.status(204).end();
        }
      });
  });

  router.post('/:id/rating', (req, res) => {
    const accountId = req.body.accountId;
    let usernmratedby = '';
    if (!accountId) {
      utils.handleError(res, 'User id not provided', 'Invalid user id', 400);
      return;
    }

    db.collection(ACCOUNTS_COLLECTION).findOne({ _id: new ObjectID(accountId) },
      (err, doc) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to find account of user rating trip');
        } else {
          usernmratedby = doc.username;
        }
      });

    db.collection(TRIPS_COLLECTION)
      .find({ _id: new ObjectID(req.params.id) })
      .forEach((x) => {
        let newNumRatings;
        let newRating;
        if (x.numRatings == null) {
          newNumRatings = 1;
          newRating = req.body.rating;
        } else {
          newNumRatings = x.numRatings + 1;
          newRating = ((x.rating * x.numRatings) + req.body.rating) / newNumRatings;
        }
        db.collection(TRIPS_COLLECTION).findOneAndUpdate({ _id: new ObjectID(req.params.id) },
          { $set: { rating: newRating },
            $inc: { numRatings: 1 } },
          (err, doc) => {
            if (err) {
              utils.handleError(res, err.message, 'Failed to find trip');
            } else {
              db.collection(ACCOUNTS_COLLECTION).findOneAndUpdate({
                _id: new ObjectID(doc.value.linkedAccount),
              }, {
                $push: {
                  feed: { $each: [`${usernmratedby} rated your trip ${doc.value.name}, ${req.body.rating}/5`],
                    $slice: 5,
                    $position: 0,
                  },
                },
              }, (err1, _) => {
                if (err) {
                  utils.handleError(res, err1.message, 'Failed to update feed');
                } else {
                  res.status(204).end();
                }
              });
              res.status(204).end();
            }
          }
        );
      });
  });

  return router;
};
