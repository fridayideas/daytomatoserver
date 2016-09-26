var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

/*
Database Schema
// PINS
{
  "_id": <ObjectId>
  "rating": <string>,
  "description": <string>, 
  "likes" : <int>,
  "duration": <long>,
  "coordinate": {
    "latitude": <double>,
    "longitude": <double>
  },
  "linkedAccount": <ObjectId>, 
  "reviews": [ {
        "linkedAccount": <ObjectId>, 
        "text": <string>,
        "date": <DateTime>
        },
        {
        "linkedAccount": <ObjectId>, 
        "text": <string>, 
        "date": <DateTime>
        } ...
      ]
}

//ACCOUNTS
{
  "_id": <ObjectId>
  "username": <string>,
  "password": <string>, 
  "numSeeds": <double>
  "numPins": <int>
}
*/

// -------------- DATABASE SET UP ------------

var app = express();
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect("mongodb://admin:seng480b@ds041556.mlab.com:41556/fridayideas", function (err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready");

  // Initialize the app.
  var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
});

// -------------- PINS API BELOW ------------

var PINS_COLLECTION = "pins";
// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

/*  "/pins"
 *    GET: finds all pins
 *    POST: creates a new seed
 */

app.get("/api/pins", function(req, res) {
  db.collection(PINS_COLLECTION).find({}).toArray(function(err, docs) {
      if (err) {
        handleError(res, err.message, "Failed to get contacts.");
      } else {
        res.status(200).json(docs);
      }
    });

});

app.post("/api/pins", function(req, res) {
  var newPin = req.body;
  newPin.createDate = new Date();

  if (!(req.body.rating || req.body.description ||
    req.body.coordinate.latitude || req.body.coordinate.longitude || req.body.linkedAccount )) {
      handleError(res, "Invalid user input", "Must provide more data.", 400);
  }

  newPin.likes = 0; 
  newPin.reviews = [];
  if (!req.body.duration){
    newPin.duration = -1; // Default duration, means never ending event (such as a park)
  }

  db.collection(PINS_COLLECTION).insertOne(newPin, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new pin.");
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

app.get("/api/pins/:id", function(req, res) {
  db.collection(PINS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) }, function(err, doc) {
      if (err) {
        handleError(res, err.message, "Failed to get pin");
      } else {
        res.status(200).json(doc);
      }
  });
});

app.put("/api/pins/:id", function(req, res) {
  var updateDoc = req.body;
  delete updateDoc._id;

  db.collection(PINS_COLLECTION).updateOne({_id: new ObjectID(req.params.id)}, updateDoc, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to update pin");
    } else {
      res.status(204).end();
    }
  });
});

app.delete("/api/pins/:id", function(req, res) {
  db.collection(PINS_COLLECTION).deleteOne({_id: new ObjectID(req.params.id)}, function(err, result) {
    if (err) {
      handleError(res, err.message, "Failed to delete pin");
    } else {
      res.status(204).end();
    }
  });
});

/*  "/pins/:topLeftLat/:topLeftLong/:bottomRightLat/:bottomRightLong"
 *    GET: Find pins inside specified coordinades.
        topLeftLat : latitude of the top left of the bounding box
        topLeftLong : longitude of the top left of the bounding box
        bottomRightLat : latitude of the bottom right of the bounding box
        bottomRightLong : longitude of the bottom right of the bounding box
 */
app.get("/api/pins/:topLeftLat/:topLeftLong/:bottomRightLat/:bottomRightLong", function(req, res) {
  db.collection(PINS_COLLECTION)
      .find({
          $and: [ { "coordinate.latitude"  : { $gte: req.params.bottomRightLat  } } ,
                  { "coordinate.latitude"  : { $lte: req.params.topLeftLat      } } , 
                  { "coordinate.longitude" : { $lte: req.params.topLeftLong     } } , 
                  { "coordinate.longitude" : { $gte: req.params.bottomRightLong } } ] } )
      .toArray(function(err, docs) {
          if (err) {
            handleError(res, err.message, "Failed to get contacts.");
          } else {
            res.status(200).json(docs);
          }
      });
});

// PUT "/pins/like/:id/
// Adds a like to the Pin ID

app.put("/api/pins/like/:id", function(req, res) {
  var updateDoc = req.body;
  delete updateDoc._id;

  db.collection(PINS_COLLECTION).findOneAndUpdate( {_id: new ObjectID(req.params.id)} , { $inc: { "likes" : 1 } } , 
    function(err, doc) {
      if (err) {
        handleError(res, err.message, "Failed to update pin");
      } else {
        res.status(204).end();
      }
  });
});

// PUT "/pins/unlike/:id/
// Takes a like from the Pin ID

app.put("/api/pins/unlike/:id", function(req, res) {
  var updateDoc = req.body;
  delete updateDoc._id;

  db.collection(PINS_COLLECTION).findOneAndUpdate( {_id: new ObjectID(req.params.id)} , { $inc: { "likes" : -1 } } , 
    function(err, doc) {
      if (err) {
        handleError(res, err.message, "Failed to update pin");
      } else {
        res.status(204).end();
      }
  });
});

// PUT Review with Pin ID
app.put("/api/pins/review/:id", function(req, res) {
  var updateDoc = req.body;
  delete updateDoc._id;
  updateDoc.createDate = new Date();

  db.collection(PINS_COLLECTION).updateOne({_id: new ObjectID(req.params.id)}, { $push: {reviews: updateDoc } }, 
    function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to add review to pin");
    } else {
      res.status(204).end();
    }
  });
});

// -------------- ACCOUNT API BELOW ------------
var ACCOUNTS_COLLECTION = "accounts";
// POST Account
app.post("/api/accounts", function(req, res) {
  var newAccount = req.body;
  newAccount.createDate = new Date();

  if (!(req.username || req.password)) {
      handleError(res, "Invalid user input", "Must provide more user data.", 400);
  }

  newAccount.numSeeds = 0; 
  newAccount.numPins = 0;

  db.collection(ACCOUNTS_COLLECTION).insertOne(newAccount, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new account.");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

// PUT Account Password
app.put("/api/accounts/:id/changePassword", function(req, res) {

  if (req.body.password) {
      handleError(res, "Invalid user input", "Must provide new password in request body.", 400);
  }

  var newPassword = req.body.password; 
  db.collection(ACCOUNTS_COLLECTION).updateOne( {_id: new ObjectID(req.params.id)} , 
    { $set: { "password" : newPassword } } , 
    function(err, doc) {
      if (err) {
        handleError(res, err.message, "Failed to update seed amount for account");
      } else {
        res.status(204).end();
      }
  });
}); 

// PUT Account Seed Amount
app.put("/api/accounts/:id/seedChange/:amount", function(req, res) {
  db.collection(ACCOUNTS_COLLECTION).findOneAndUpdate( {_id: new ObjectID(req.params.id)} , 
    { $inc: { "numSeeds" : req.params.amount } } , 
    function(err, doc) {
      if (err) {
        handleError(res, err.message, "Failed to update seed amount for account");
      } else {
        res.status(204).end();
      }
  });
}); 

