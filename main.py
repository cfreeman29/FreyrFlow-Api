from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

BEARER_TOKEN = 'your-bearer-token'
TARGET_API_URL = 'https://api.example.com'

@app.route('/healthcheck')
def healthcheck():
    return jsonify({'status': 'OK'}), 200

@app.route('/', defaults={'path': ''}, methods=['GET', 'POST', 'PUT', 'DELETE'])
@app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy(path):
    try:
        # Create a new request to the target API
        url = f'{TARGET_API_URL}/{path}'
        headers = {
            'Authorization': f'Bearer {BEARER_TOKEN}',
            'Content-Type': request.headers.get('Content-Type', 'application/json')
        }
        data = request.get_data()

        # Send the request to the target API
        response = requests.request(request.method, url, headers=headers, data=data)

        # Forward the response from the target API to the client
        return jsonify(response.json()), response.status_code

    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=3000)