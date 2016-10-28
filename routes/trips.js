const express = require('express');
const ObjectID = require('mongodb').ObjectID;
const utils = require('../utils');

const PINS_COLLECTION = 'pins';
const ACCOUNTS_COLLECTION = 'accounts';
const TRIPS_COLLECTION = 'trips';

const router = new express.Router();

/* trip
 * name: ""
 * type: ""
 * likes: #
 * dislikes: #
 * rating: 1-5
 * pins: [pinid1,pinid2]
 *
 *
 */

module.exports = (db) => {
  function pinInfoForTrip(trip) {
    const pinIds = trip.pins.map(ObjectID);
    return db.collection(PINS_COLLECTION)
      .find({ _id: { $in: pinIds } }).toArray()
      .then(pins => Object.assign({}, trip, { pins }));
  }

  router.route('/').get((req, res) => {
    const filterKeys = ['type', 'cost', 'linkedAccount'];
    const sortKeys = ['srating', 'scost', 'screateDate', 'slikes'];
    const keys = [];
    for(var i in req.query){
      if(i == 'linkedAccount'){
        keys.push( { [i] : req.query[i] } );
      }
      else if(i == 'cost'){
        const c = (req.query.cost).split(',');
        keys.push( {
          $and: [
            { 'cost' : { $lte: parseInt(c[1]) } },
            { 'cost' : { $gte: parseInt(c[0]) } }
          ] }
        );
      }
      else{
        keys.push( { [i] : parseInt(req.query[i]) } );
      }
    }

    const filters = keys.length>0 ? { $and: keys } : {};

    db.collection(TRIPS_COLLECTION)
      .find(filters)
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
    let usernmlikedby = '';
    if (!accountId) {
      utils.handleError(res, 'User id not provided', 'Invalid user id', 400);
      return;
    }

    db.collection(ACCOUNTS_COLLECTION).findOne({ _id: new ObjectID(accountId) },
      (err, doc) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to update pin');
        } else {
          usernmlikedby = doc.username;

          db.collection(TRIPS_COLLECTION)
            .findOneAndUpdate({ _id: new ObjectID(req.params.id) }, {
              $addToSet: { likedBy: accountId },
              $pull: { dislikedBy: accountId },
              $inc: { likes: 1 },
            }, (err, doc) => {
              if (err) {
                utils.handleError(res, err.message, 'Failed to add like to trip');
              } else {
                db.collection(ACCOUNTS_COLLECTION).findOneAndUpdate({
                  _id: new ObjectID(doc.value.linkedAccount),
                }, {
                  $push: {
                    feed: { $each: [`${usernmlikedby} liked your trip ${doc.value.name}`],
                      $slice: 5,
                      $position: 0,
                    },
                  },
                }, (err1, _) => {
                  if (err1) {
                    utils.handleError(res, err1.message, 'Failed to update feed');
                  } else {
                    res.status(204).end();
                  }
                });
                res.status(204).end();
              }
          });
        }
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
        .forEach( function(x) {
          if(x.numRatings==null){
            var newNumRatings = 1
            var newRating = req.body.rating;
          }
          else{
            var newNumRatings = x.numRatings + 1;
            var newRating = (x.rating * x.numRatings + req.body.rating)/newNumRatings;
          }
          db.collection(TRIPS_COLLECTION).findOneAndUpdate( { _id: new ObjectID(req.params.id) },
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

  router.route('/outdoor/one').get((req, res) => {
    console.log(req.query.type)
    db.collection(TRIPS_COLLECTION).find( {"type": parseInt(req.query.type)} )
      .toArray((err, docs) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to get trips');
        } else {
          Promise.all(docs.map(pinInfoForTrip))
            .then(trips => res.status(200).json(trips));
        }
      });
    });
    router.route('/attractions/two').get((req, res) => {
      db.collection(TRIPS_COLLECTION).find( {"type":2} )
        .toArray((err, docs) => {
          if (err) {
            utils.handleError(res, err.message, 'Failed to get trips');
          } else {
            Promise.all(docs.map(pinInfoForTrip))
              .then(trips => res.status(200).json(trips));
          }
        });
      });
      router.route('/foodie/three').get((req, res) => {
        db.collection(TRIPS_COLLECTION).find( {"type":3} )
          .toArray((err, docs) => {
            if (err) {
              utils.handleError(res, err.message, 'Failed to get trips');
            } else {
              Promise.all(docs.map(pinInfoForTrip))
                .then(trips => res.status(200).json(trips));
            }
          });
        });

  return router;
};
