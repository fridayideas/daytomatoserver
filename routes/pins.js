const express = require('express');
const ObjectID = require('mongodb').ObjectID;
const utils = require('../utils');

const PINS_COLLECTION = 'pins';
const ACCOUNTS_COLLECTION = 'accounts';

const router = new express.Router();

module.exports = (db, auth) => {
  router.use(auth);
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
  router.route('/').get((req, res) => {
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
          utils.handleError(res, err.message, 'Failed to get pins.');
        } else {
          res.status(200).json(docs);
        }
      });
  }).post((req, res) => {
    const newPin = req.body;
    newPin.createDate = new Date();
    newPin.cost = req.body.cost || 0.0;
    newPin.image = req.body.image || '';
    newPin.review = req.body.review || '';
    newPin.likes = req.body.likes || 0;
    newPin.comments = req.body.comments || [];
    newPin.comments = req.body.likedBy || [];
    newPin.comments = req.body.dislikedBy || [];

    if (!req.body.duration) {
      newPin.duration = -1; // Default duration, means never ending event (such as a park)
    }

    db.collection(PINS_COLLECTION).insertOne(newPin, (err, doc) => {
      if (err) {
        utils.handleError(res, err.message, 'Failed to create new pin.');
      } else {
        res.status(201).json(doc.ops[0]);
      }
    });
  });

  /**
   * "/pins/:id"
   *   GET: find pin by id
   *   PUT: update pin by id
   *   DELETE: deletes pin by id
   */
  router.route('/:id').get((req, res) => {
    db.collection(PINS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) }, (err, doc) => {
      if (err) {
        utils.handleError(res, err.message, 'Failed to get pin');
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
          utils.handleError(res, err.message, 'Failed to update pin');
        } else {
          res.status(204).end();
        }
      });
  }).delete((req, res) => {
    db.collection(PINS_COLLECTION)
      .deleteOne({ _id: new ObjectID(req.params.id) }, (err, result) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to delete pin');
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
        }
      });

    db.collection(PINS_COLLECTION)
      .findOneAndUpdate({ _id: new ObjectID(req.params.id) }, {
        $addToSet: { likedBy: accountId },
        $pull: { dislikedBy: accountId },
        $inc: { likes: 1 },
      }, (err, doc) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to update pin');
        } else {
          db.collection(ACCOUNTS_COLLECTION).findOneAndUpdate({
            _id: new ObjectID(doc.value.linkedAccount),
          }, {
            $push: {
              feed: { $each: [`${usernmlikedby} liked your pin ${doc.value.pinName}`],
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
  });

// POST "/pins/dislikes/:id/
// Takes a like from the Pin ID

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
          utils.handleError(res, err.message, 'Failed to update pin');
        } else {
          usernmdislikedby = doc.username;
        }
      });

    db.collection(PINS_COLLECTION)
      .findOneAndUpdate({ _id: new ObjectID(req.params.id) }, {
        $addToSet: { dislikedBy: accountId },
        $pull: { likedBy: accountId },
        $inc: { likes: -1 },
      }, (err, doc) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to update pin');
        } else {
          db.collection(ACCOUNTS_COLLECTION).findOneAndUpdate({
            _id: new ObjectID(doc.value.linkedAccount),
          }, {
            $push: {
              feed: { $each: [`${usernmdislikedby} disliked your pin ${doc.value.pinName}`],
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

  // POST Comment with Pin ID
  router.post('/:id/comments', (req, res) => {
    const updateDoc = req.body;
    const accountId = updateDoc.linkedAccount;
    // TODO possibly not set if async timings are off
    delete updateDoc._id;
    updateDoc.createDate = new Date();
    db.collection(ACCOUNTS_COLLECTION).findOne({ _id: new ObjectID(accountId) })
      .then(doc => doc.username, (err) => {
        utils.handleError(res, err.message, 'Failed to update pin');
      })
      .then((usernmcommentedby) => {
        db.collection(PINS_COLLECTION)
          .findOneAndUpdate({ _id: new ObjectID(req.params.id) },
            { $push: { comments: updateDoc } },
            (err, doc) => {
              if (err) {
                utils.handleError(res, err.message, 'Failed to add comment to pin');
              } else {
                db.collection(ACCOUNTS_COLLECTION).findOneAndUpdate({
                  _id: new ObjectID(doc.value.linkedAccount),
                }, {
                  $push: {
                    feed: {
                      $each: [`${usernmcommentedby} commented your pin ${doc.value.pinName}`],
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
      });
  });

  // DELETE Comment with Pin ID & Account IDs
  router.delete('/:pinid/comments/:accountid', (req, res) => {
    console.log(`Trying to remove from pin ${req.params.pinid} comment from account ${req.params.accountid}`);

    db.collection(PINS_COLLECTION).update({ _id: new ObjectID(req.params.pinid) },
      { $pull: { comments: { linkedAccount: parseInt(req.params.accountid, 10) } } },
      (err, doc) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to remove comment from pin');
        } else {
          res.status(204).end();
        }
      });
  });

  // Updates Comment and sets createDate to new date
  router.put('/:pinid/comments/:accountid', (req, res) => {
    db.collection(PINS_COLLECTION).findOneAndUpdate({ _id: new ObjectID(req.params.pinid),
        comments: { $elemMatch: { linkedAccount: parseInt(req.params.accountid, 10) } } },
      { $set: { 'comments.$.text': req.body.text, 'comments.$.createDate': new Date() } },
      (err, doc) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to update comment from pin');
        } else {
          res.status(204).end();
        }
      });
  });

  return router;
};
