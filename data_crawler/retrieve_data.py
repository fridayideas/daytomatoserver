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
	with open("data_activities.txt", "a") as myfile:
		myfile.write(str(api_calls))

def get_results(params):

	#Obtain these from Yelp's manage access page
  	consumer_key = "YOUR_CONSUMER_KEY"
	consumer_secret = "YOUR_CONSUMER_SECRET"
	token = "YOUR_TOKEN"
	token_secret = "YOUR_TOKEN_SECRET"
	
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
	params["category_filter"] = "arts"
	params["ll"] = "{},{}".format(str(lat),str(longi))
	params["radius_filter"] = "2000"

	return params

if __name__=="__main__":
	main()
