const express = require('express');
const mongodb = require('mongodb');

const router = new express.Router();
const ObjectID = mongodb.ObjectID;

const pins = require('./pins');
const accounts = require('./accounts');
const trips = require('./trips');

module.exports = (db, auth) => {
  // -------------- PINS API BELOW -------------------------------
  router.use('/pins', pins(db, auth));
  // -------------- ACCOUNT API BELOW -------------------------
  router.use('/accounts', accounts(db, auth));
  // -------------- TRIPS API BELOW -------------------------
  router.use('/trips', trips(db));

  return router;
};
