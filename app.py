from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

api_configs = {}

@app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy(path):
    # Get the API configuration based on the requested path
    api_config = api_configs.get(path)
    
    if api_config:
        # Extract the API endpoint and bearer token from the configuration
        api_endpoint = api_config['endpoint']
        bearer_token = api_config['bearer_token']
        
        try:
            # Create a new request to the target API
            url = f'{api_endpoint}/{path}'
            headers = {
                'Authorization': f'Bearer {bearer_token}',
                'Content-Type': request.headers.get('Content-Type', 'application/json')
            }
            data = request.get_data()
            
            # Send the request to the target API
            response = requests.request(request.method, url, headers=headers, data=data)
            
            # Forward the response from the target API to the client
            return jsonify(response.json()), response.status_code
        
        except requests.exceptions.RequestException as e:
            return jsonify({'error': str(e)}), 500
    
    else:
        return jsonify({'error': 'API endpoint not found'}), 404

@app.route('/configure', methods=['POST'])
def configure():
    config_data = request.get_json()
    path = config_data['path']
    endpoint = config_data['endpoint']
    bearer_token = config_data['bearer_token']
    
    api_configs[path] = {
        'endpoint': endpoint,
        'bearer_token': bearer_token
    }
    
    return jsonify({'message': 'API configuration added successfully'})

if __name__ == '__main__':
    app.run(port=3000)
