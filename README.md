# daytomatoserver
Mongo + Express + Node server

[![Build Status](https://travis-ci.org/fridayideas/daytomatoserver.svg?branch=master)](https://travis-ci.org/fridayideas/daytomatoserver)


#REST API DOCUMENTATION
----
##Pins
  <_A pin is an attractionon a map. It has a location, as well as information about the attraction and user reviews_>

### Getting pins

* **Request**

  `GET [host]/api/pins`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | ----------------  | --------
`searcharea`  | Optional. Comprised of a list of 4 comma-separated integers.The returned pins will be from within the search area.|`GET [HOST]/api/pins?searcharea=123,456,789,1011`
                  | `searcharea=[LatitudeOfTopLeftCoordinate],[LongitudeOfTopLeftCoordinate],[LatitudeOfBottomRightCoordinate],[LongitudeOfBottomRightCoordinate]` |

* **Data Params in Request Body**

   <_No request parameters_>

### Creating a pin

* **Request**

  `POST [host]/api/pins`

*  **URL Params**

   <_No URL parameters_>

* **Data Params on Request Body**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`name`            | Optional. The name of the attraction | `{"name":"Elziger Castle"}`
`rating`          | Optional. Initial rating of the pin's attraction |`{"rating":"5"}`
`pinType`         | Optional. The type of the pin where `0=Restaurant`,`1=Activities`,`2=__`,`3=__` | `{"pinType":"0"}`
`cost`            | Optional. The approximate amount of money spent at the attraction | `{"cost":"0,0"}`
`description`     | Optional. A description of the attraction | `{"description":"A historical castle"}`
`image`           | Optional. A url to an image of the attraction | `{"image":"http://..."}`
`expireAt`     | Optional. The date and time when the event expires. Do not include this field for a permanent pin. | `{"expireAt":"2016-11-20T22:00:00.000Z"}`
`coordinate`      | Required. An array containing `latitude` and `longitude` | `{"coordinate":{"latitude":"49","longitude":"50"}}`
`linkedAccount`   | Required. Account that has posted the pin | `{"linkedAccount":"123"}`

* **Example Query**

  `'{"pinType":"0","name":"Hello world","rating":"5", "cost":"0.0", "description":"Very cool", "image":"http://...", "coordinate":{"latitude":"49","longitude":"50"},"linkedAccount":"1"}'`

### Getting a pin

* **Request**

  `GET [host]/api/pins/:id`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`id`            | Required. The ID of the requested pin | `GET [HOST]/api/pins/123`

* **Data Params on Request Body**

   <_No Data Parameters in Body_>


### Deleting a pin

* **Request**

  `DELETE [host]/api/pins/:id`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`id`            | Required. The ID of the requested pin | `DELETE [HOST]/api/pins/123`

* **Data Params on Request Body**

   <_No Data Parameters in Body_>

### Changing a pin

* **Request**

  `PUT [host]/api/pins/:id`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`id`            | Required. The ID of the requested pin | `PUT [HOST]/api/pins/123`

* **Data Params on Request Body**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`name`            | Optional. The name of the attraction | `{"name":"Elziger Castle"}`
`rating`          | Optional. Initial rating of the pin's attraction |`{"rating":"5"}`
`pinType`         | Optional. The type of the pin where `0=Restaurant`,`1=Activities`,`2=__`,`3=__` | `{"pinType":"0"}`
`cost`            | Optional. The approximate amount of money spent at the attraction | `{"cost":"0,0"}`
`description`     | Optional. A description of the attraction | `{"description":"A historical castle"}`
`image`           | Optional. A url to an image of the attraction | `{"image":"http://..."}`
`coordinate`      | Required. An array containing `latitude` and `longitude` | `{"coordinate":{"latitude":"49","longitude":"50"}}`
`linkedAccount`   | Required. Account that has posted the pin | `{"linkedAccount":"123"}`


### Liking a pin

   <_Increases the likes amount by 1 to the specified pin_>

* **Request**

  `POST [host]/api/pins/:id/likes`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`id`            | Required. The ID of the requested pin | `POST [HOST]/api/pins/123/likes`

* **Data Params on Request Body**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`accountId`            | Required. The ID of the user liking the pin | `{"accountId": 123}`

### Unliking a pin

   <_Decreases the likes amount by 1 to the specified pin_>

* **Request**

  `POST [host]/api/pins/:id/dislikes`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`id`            | Required. The ID of the requested pin | `POST [HOST]/api/pins/123/dislikes`

* **Data Params on Request Body**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`accountId`            | Required. The ID of the user disliking the pin | `{"accountId": 123}`

### Adding a review to a pin

* **Request**

  `POST [host]/api/pins/:id/review`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`id`            | Required. The ID of the requested pin | `POST [host]/api/pins/123/review`

* **Data Params on Request Body**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`text`            | Required. The description of the review | `{"text":"This place is amazing!"}`
`linkedAccount`          | Required. The account id of the review's poster |`{"linkedAccount":"123"}`

### Deleting a review from a pin

* **Request**

  `DELETE [host]/api/pins/:pinid/reviews/:accountid`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`pinid`            | Required. The ID of the requested pin from which the review will be deleted | `POST [host]/api/pins/123/reviews/456`
`accountid`      | Required. The user's account ID whose review is being deleted. | `POST [host]/api/pins/123/reviews/456`

* **Data Params on Request Body**

   <_No Data Parameters in Body_>


### Updating a review from a pin

* **Request**

  `PUT [host]/api/pins/:pinid/reviews/:accountid`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`pinid`            | Required. The ID of the requested pin from which the review will be updated | `POST [host]/api/pins/123/reviews/456`
`accountid`      | Required. The user's account ID whose review is being updated. | `POST [host]/api/pins/123/reviews/456`

* **Data Params on Request Body**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`text`            | Required. The description of the new review | `{"text":"This place is amazing!"}`



##Accounts
  <_An account represents a user account. It contains username and a token from the Google OAuth Provider_>

### Getting account information

* **Request**

  `GET [host]/api/accounts/:id`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`id`            | Required. The ID of the requested account | `GET [HOST]/api/accounts/123`

### Creating an account

* **Request**

  `POST [host]/api/accounts`

*  **URL Params**

   <_No URL parameters_>

* **Data Params on Request Body**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`username`            | Required. The username of the user. This will be associated e-mail address from the Google OAuth Provider | `{"username":"jw@uvic.ca"}`
`token`          | Required. The login token from the OAuth Provider |`{"token":"asd123sdt35"}`

### Changing seed amount of an account

* **Request**

  `PUT [host]/api/accounts/seeds/:id/:amount`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`id`            | Required. The ID of the user whose seed amount is being changed | `PUT [HOST]/api/accounts/seeds/123/1`
`amount`            | Required. The amount by which to increase or decrease the seed amount. This can be a negative or a decimal number0 | `PUT [HOST]/api/accounts/seeds/123/0.01`


* **Data Params on Request Body**

   <_No Data Parameters in Body_>

## Trips
  <_A trip is a collection of pins that a user can visit in a day_>

### Getting trips

* **Request**

  `GET [host]/api/trips`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`type`            | Optional. Filter by type of trip. 1=outdoors, 2=attractions, 3=foodie | `GET [HOST]/api/trips?type=1
`cost`            | Optional. Filter by cost, specifying upper and lower bound | `GET [HOST]/api/trips?cost=0,50`
`linkedAccount`            | Optional. Filter by user account that created trip | `GET [HOST]/api/trips?linkedAccount=57f19560d531481da80e3a09`
`sort`            | Optional. Sort by field specified, from high to low (-1) or low to high (1) | `GET [HOST]/api/trips?sort=createDate,1`


* **Data Params in Request Body**

   <_No request parameters_>

### Creating a trip

* **Request**

  `POST [host]/api/trips`

*  **URL Params**

   <_No URL parameters_>

* **Data Params on Request Body**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`name`            | Optional. The name of the trip | `{"name":"Essential attractions"}`
`type`         	  | Optional. The type of the trip. 1=outdoors, 2=attractions, 3=foodie | `{"type":2}`
`description`     | Optional. A description of the trip | `{"description":"All the best attrations you can see in one day"}`
`cost`     | Optional. Estimated cost of the trip | `{"cost":20}`
`pins`		  | Required. An array of the pin id's in the trip | `{"pins": ["123", "456"] }`
`linkedAccount`   | Required. Account that has posted the trip | `{"linkedAccount":"57f19560d531481da80e3a09"}`

* **Example Query**

  `'{ "name": "Trip1", "type": 1, "cost": 20, "pins": [ "57f353c0a77c0b319430919c", "57f35406a77c0b319430919e", "57f357369e1f9022c8316bbf" ], "linkedAccount": "57f19560d531481da80e3a09" }'`

### Getting a trip

* **Request**

  `GET [host]/api/pins/:id`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`id`            | Required. The ID of the requested trip | `GET [HOST]/api/trips/123`

* **Data Params on Request Body**

   <_No Data Parameters in Body_>

### Deleting a trip

* **Request**

  `DELETE [host]/api/trip/:id`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`id`            | Required. The ID of the requested trip | `DELETE [HOST]/api/trips/123`

* **Data Params on Request Body**

   <_No Data Parameters in Body_>

### Liking a trip

   <_Increases the likes amount by 1 to the specified trip_>

* **Request**

  `POST [host]/api/trips/:id/likes`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`id`            | Required. The ID of the requested trip | `POST [HOST]/api/trips/123/likes`

* **Data Params on Request Body**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`accountId`            | Required. The ID of the user liking the trip | `{"accountId": 123}`

### Disliking a trip

   <_Decreases the likes amount by 1 to the specified trip_>

* **Request**

  `POST [host]/api/trips/:id/dislikes`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`id`            | Required. The ID of the requested trip | `POST [HOST]/api/trips/123/dislikes`

* **Data Params on Request Body**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`accountId`            | Required. The ID of the user disliking the trip | `{"accountId": 123}`

### Rating a trip

   <_Updates the average rating of the specified trip according to rating given_>

* **Request**

  `POST [host]/api/trips/:id/rating`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`id`            | Required. The ID of the requested trip | `POST [HOST]/api/trips/123/rating`

* **Data Params on Request Body**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`accountId`            | Required. The ID of the user rating the trip | `{"accountId": 123}`
`rating`            | Required. The rating from 1-5 given by the user | `{"rating": 5}`
