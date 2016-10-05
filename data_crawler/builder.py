# PIN structure
# {"rating": <string>, 
# "pinType": 0, 
# "name": <string>, 
# "description": <string>, 
# "likes" : 0, 
# "coordinate": { 
# 	"latitude": <double>, 
# 	"longitude": <double>
# 	}, 
# "linkedAccount": <ObjectId>, 
# "reviews": [{"linkedAccount":<ObjectId>,"text":<string>,"createDate":<Date>}...]
# }


#pintypes= 0:restaurants; 1:sights; 2:hiking

import rauth
import time
import requests
import json

def main():
	with open("json_data_restaurants.txt", "a") as myfile:
		myfile.write("[")
		f = open('data.txt', 'r')
		for line in f.readlines():
			#print line
			if "rating" in line:
				if "{u'is_claimed': True" in line:
					rating = line.split("{u'is_claimed': True, u'rating': ")
				else:
					rating = line.split("{u'is_claimed': False, u'rating': ")
				rating = rating[1].split(", u'mobile_url'")
				print rating[0]
				name = rating[1].split("'name': u'")
				name = name[1].split("', u'rating_img_url_small':")
				print name[0]
				if rating[0] =='0.0':
					lat = name[1].split("latitude': ")
					lat = lat[1].split(", u'longitude': ")
					longi = lat[1].split("}, u'state_code")
					print lat[0], longi[0]
					id = longi[1].split("u'id': u'")
					id = id[1].split("', u'categories'")
					print id[0]
					categories = id[1].split("u'distance'")
					print categories[0]
					category = categories[0].split("'")
					print category[1]
					
				else:
					categories = name[1].split("u'categories':")
					categories = categories[1].split(", u'display_phone'")
					print categories[0]
					category = categories[0].split("'")
					print category[1]
					id = categories[1].split("u'id': u'")
					id = id[1].split("', u'snippet_image_url'")
					print id[0]
					lat = id[1].split("latitude': ")
					lat = lat[1].split(", u'longitude': ")
					longi = lat[1].split("}, u'state_code")
					print lat[0], longi[0]

				pin = {'rating': rating[0], 
					'pinType': 0, 
					'name': name[0], 
					'description': category[1], 
					'likes' : 0, 
					'coordinate': { 
						'latitude': lat[0], 
						'longitude': longi[0]
						}, 
					'linkedAccount': 'YELP'
					}
				# add in post request here to post to server
				# print pin
				# url = 'http://localhost:8080/api/pins'
				# r = requests.post(url, json=pin)
				# print r
				myfile.write(str(pin))
				myfile.write("\n")
				
		f.close()
		myfile.write("]")


if __name__=="__main__":
	main()
