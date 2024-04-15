from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from pymongo import MongoClient
import os

app = Flask(__name__)
CORS(app)

#Set up Environment Variables
MONGODB_URI = os.getenv('MONGODB_URI')
MONGODB_DB = os.getenv('MONGODB_DB')
MONGODB_COLLECTION = os.getenv('MONGODB_COLLECTION')

# Set up MongoDB connection
client = MongoClient(MONGODB_URI)
db = client[MONGODB_DB]
api_configs_collection = db[MONGODB_COLLECTION]

@app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy(path):
    api_config = api_configs_collection.find_one({'path': {'$regex': f'^{path}'}})

    if api_config:
        endpoint = api_config['endpoint']
        bearer_token = api_config.get('bearer_token')

        try:
            # Create a new request to the target API
            url = f'{endpoint}/{path[len(api_config["path"]):]}'
            headers = {
                'Content-Type': request.headers.get('Content-Type', 'application/json')
            }
            if bearer_token:
                headers['Authorization'] = f'Bearer {bearer_token}'
            data = request.get_data()

            # Send the request to the target API
            response = requests.request(request.method, url, headers=headers, data=data)

            # Forward the response from the target API to the client
            return jsonify(response.json()), response.status_code

        except requests.exceptions.RequestException as e:
            return jsonify({'error': str(e)}), 500

    return jsonify({'error': 'API endpoint not found'}), 404

@app.route('/configure', methods=['POST'])
def configure():
    config_data = request.get_json()
    path = config_data['path']
    endpoint = config_data['endpoint']
    bearer_token = config_data.get('bearer_token')

    api_config = {
        'path': path,
        'endpoint': endpoint
    }
    if bearer_token:
        api_config['bearer_token'] = bearer_token

    api_configs_collection.insert_one(api_config)

    return jsonify({'message': 'API configuration added successfully'})

if __name__ == '__main__':
    app.run(port=3000)