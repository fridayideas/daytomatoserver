import rauth
import time

def main():
	locations = [(48.44, -123.34), (48.40, -123.37), (48.42, -123.30), (48.44, -123.33), (48.47, -123.32)]
	api_calls = []
	for lat,longi in locations:
		params = get_search_parameters(lat, longi)
		api_calls.append(get_results(params))

		time.sleep(1.0)
		
	##Do other processing
	with open("data.txt", "a") as myfile:
		myfile.write(str(api_calls))

	with open("json_data.txt", "a") as myfile:
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

				pin = """{{"rating": {one}, "pinType": 0, "name": {two}, "description": {three}, "likes" : 0, "coordinate": {{ "latitude": {four}, "longitude": {five}}}, "linkedAccount": FridayIdeas, "reviews": [{{"linkedAccount":null,"text":null,"createDate":null}}]}},\n""".format(one=rating[0], two=name[0], three=category[1], four=lat[0], five=longi[0])
				myfile.write(pin)
				
		f.close()
		myfile.write("]")

def get_results(params):

	#Obtain these from Yelp's manage access page
  	consumer_key = "YOUR_CONSUMER_KEY"
	consumer_secret = "YOUR_CONSUMER_SECRET"
	token = "YOUR_TOKEN"
	token_secret = "YOUR TOKEN_SECRET"
	
	session = rauth.OAuth1Session(
		consumer_key = consumer_key
		,consumer_secret = consumer_secret
		,access_token = token
		,access_token_secret = token_secret)
		
	request = session.get("http://api.yelp.com/v2/search",params=params)
	
	#Transforms the JSON API response into a Python dictionary
	data = request.json()
	session.close()
	
	return data
		
def get_search_parameters(lat,longi):
	#See the Yelp API for more details
	params = {}
	params["categories"] = "restaurant"
	params["ll"] = "{},{}".format(str(lat),str(longi))
	params["radius"] = "1000"

	return params

if __name__=="__main__":
	main()
