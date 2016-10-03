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
`pinType`         | Optional. The type of the pin where `0=Beginner`,`1=__`,`2=__`,`3=__` | `{"pinType":,"0"}`
`description`     | Optional. A description of the attraction | `{"description":"A historical castle"}`
`coordinate`      | Required. An array containing `latitude` and `longitude` | `{"coordinate":{"latitude":"49","longitude":"50"}}`
`linkedAccount`   | Required. Account that has posted the pin | `{"linkedAccount":"123"}`

* **Example Query**

  `'{"pinType":"0","pinName":"Hello world","rating":"5","description":"Very cool","coordinate":{"latitude":"49","longitude":"50"},"linkedAccount":"1"}'`

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
`pinType`         | Optional. The type of the pin where `0=Beginner`,`1=__`,`2=__`,`3=__` | `{"pinType":,"0"}`
`description`     | Optional. A description of the attraction | `{"description":"A historical castle"}`
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

### Unliking a pin

   <_Decreases the likes amount by 1 to the specified pin_>

* **Request**

  `POST [host]/api/pins/:id/dislikes`

*  **URL Params**

     Name         |   Description & Usage    |   Example
----------------- | -----------------------  | --------
`id`            | Required. The ID of the requested pin | `POST [HOST]/api/pins/123/dislikes`

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

