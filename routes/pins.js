const express = require('express');
const ObjectID = require('mongodb').ObjectID;
const utils = require('../utils');

const HttpError = utils.HttpError;

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
  router.route('/').get((req, res) => {
    const filterKeys = ['pinType', 'cost', 'linkedAccount'];
    const sortKeys = ['rating', 'cost', 'createDate', 'likes', 'name'];
    const limit = ~~req.query.limit;
    const keys = [];

    const searchArea = (req.query.searchArea || '').split(',');
    const sArea = searchArea.length === 4 ? {
      $and: [
        { 'coordinate.latitude': { $lte: parseFloat(searchArea[0]) } },
        { 'coordinate.longitude': { $lte: parseFloat(searchArea[1]) } },
        { 'coordinate.latitude': { $gte: parseFloat(searchArea[2]) } },
        { 'coordinate.longitude': { $gte: parseFloat(searchArea[3]) } },
      ],
    } : {};

    keys.push(sArea);

    let sortKey = null;
    let sortdir = 1;

    for (const i of Object.keys(req.query)) {
      if (i === 'sort') {
        sortKey = req.query[i];
      } else if (i === 'sortdir') {
        sortdir = parseInt(req.query[i], 10);
      } else if (i === 'linkedAccount') {
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
      } else if (i !== 'limit' && i !== 'searchArea') {
        keys.push({ [i]: parseInt(req.query[i], 10) });
        keys.push({ [i]: { $exists: true } });
      }
    }

    const filters = keys.length > 0 ? { $and: keys } : {};
    const sort = sortKeys.includes(sortKey) ? {
      [sortKey]: sortdir,
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
    newPin.likedBy = req.body.likedBy || [];
    newPin.dislikedBy = req.body.dislikedBy || [];

    if (!req.body.expireAt) {
      // Default expiration time, means never ending event (such as a park)
      newPin.expireAt = null;
    } else {
      // set date and time for expiration. example : "2016-11-20T22:00:00.000Z"
      newPin.expireAt = new Date(req.body.expireAt);
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

  function getUpdateParams(accountId, dir, inLikedBy, inDislikedBy) {
    const params = {
      $inc: { likes: dir },
    };
    switch (dir) {
      case 1:
        params.$addToSet = { likedBy: accountId };
        params.$pull = { dislikedBy: accountId };
        break;
      case -1:
        params.$addToSet = { dislikedBy: accountId };
        params.$pull = { likedBy: accountId };
        break;
      default:
        params.$pull = { likedBy: accountId, dislikedBy: accountId };
        params.$inc.likes = inLikedBy ? -1 : 1;
        break;
    }
    return params;
  }

// PUT "/pins/like/:id/:userId
// Adds or removes a like or dislike from a Pin
  router.put('/:id/votes/:userId', (req, res) => {
    if (!req.user || !req.params.userId) {
      utils.handleError(res, 'User id not provided', 'Invalid user id', 400);
      return;
    }

    const dir = Math.sign(parseInt(req.body.dir, 10));
    if (Number.isNaN(dir)) {
      utils.handleError(res, 'dir is not a number', 'dir is not a number', 400);
      return;
    }

    db.collection(ACCOUNTS_COLLECTION).findOne({ auth0Id: req.user.sub })
      .then((acct) => {
        if (!acct) {
          throw new HttpError('User account not found', 404);
        }
        return db.collection(PINS_COLLECTION)
          .findOne({ _id: new ObjectID(req.params.id) })
          .then(doc => ({ pin: doc, account: acct }));
      })
      .then(({ pin, account }) => {
        const inLikedBy = pin.likedBy.map(String)
          .includes(String(account._id));
        const inDislikedBy = pin.dislikedBy.map(String)
          .includes(String(account._id));
        if (dir !== 0 &&
          ((dir === 1 && inLikedBy) ||
          (dir === -1 && inDislikedBy))) {
          const action = dir === 1 ? 'liked' : 'disliked';
          throw new HttpError(`account already ${action} pin`, 409);
        }
        const update = getUpdateParams(account._id, dir, inLikedBy, inDislikedBy);

        return db.collection(PINS_COLLECTION)
          .findOneAndUpdate({ _id: new ObjectID(req.params.id) }, update)
          .then(() => ({ pin, account }));
      })
      .then(({ pin, account }) => {
        if (dir !== 0) {
          return db.collection(ACCOUNTS_COLLECTION).findOneAndUpdate({
            _id: new ObjectID(pin.linkedAccount),
          }, {
            $push: {
              feed: {
                $each: [`${account.username} liked your pin ${pin.name}`],
                $slice: 5,
                $position: 0,
              },
            },
          }).catch((err) => {
            utils.handleError(res, err.message, 'Failed to update feed');
          });
        }
        return Promise.resolve(pin);
      })
      .then(() => {
        res.status(204).end();
      }, (err) => {
        if (err instanceof HttpError) {
          utils.handleError(res, err.message, err.message, err.status);
        } else {
          utils.handleError(res, err.message, err.message);
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
