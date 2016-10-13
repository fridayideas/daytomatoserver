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
 * pins: [pinid1,pinid2]
 *
 *
 */

module.exports = (db) => {

  router.route('/').get((req, res) => {
    db.collection(TRIPS_COLLECTION).find()
      .toArray((err, docs) => {
        if (err) {
          utils.handleError(res, err.message, 'Failed to get trips');
        } else {
          res.status(200).json(docs);
        }
    });
  }).post((req, res) => {
    const newTrip = req.body;
    newTrip.createDate = new Date();

    var pin_ids = newTrip.pins.map(function (item){ return ObjectID(item)});
    newTrip.pins = [];

    for(i = 0; i < pin_ids.length; i++) {
      db.collection(PINS_COLLECTION).findOne({ _id: pin_ids[i] },
        (err, doc) => {
          if(err) {
            utils.handleError(res, err.message, 'Failed to get pins from trip');
          } else {
            newTrip.pins.push(doc);
          }
        });
    }
    db.collection(TRIPS_COLLECTION).insertOne(newTrip, (err, doc) => {
      if (err) {
        handleError(res, err.message, 'Failed to create new trip.');
      } else {
        console.log(50)
        res.status(201).json(doc.ops[0]);
      }
    });
  });

  router.route('/:id').get((req, res) => {
    db.collection(TRIPS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) }, (err, doc) => {
      if (err) {
        utils.handleError(res, err.message, 'Failed to get trip');
      } else {
        res.status(200).json(doc);
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

  return router;
};
