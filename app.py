from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

api_configs = {}

@app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy(path):
    # Get the API configuration based on the requested path
    for configured_path, api_config in api_configs.items():
        if path.startswith(configured_path):
            # Extract the API endpoint and bearer token from the configuration
            api_endpoint = api_config['endpoint']
            bearer_token = api_config.get('bearer_token')
            
            try:
                # Create a new request to the target API
                url = f'{api_endpoint}/{path[len(configured_path):]}'
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
    
    api_configs[path] = {
        'endpoint': endpoint
    }
    if bearer_token:
        api_configs[path]['bearer_token'] = bearer_token
    
    return jsonify({'message': 'API configuration added successfully'})

if __name__ == '__main__':
    app.run(port=3000)