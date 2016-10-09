const express = require('express');
const mongodb = require('mongodb');

const router = new express.Router();
const ObjectID = mongodb.ObjectID;

const pins = require('./pins');
const accounts = require('./accounts');

module.exports = (db) => {
  // -------------- PINS API BELOW -------------------------------
  router.use('/pins', pins(db));
  // -------------- ACCOUNT API BELOW -------------------------
  router.use('/accounts', accounts(db));

  return router;
};
