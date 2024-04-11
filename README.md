# Self-Hosted API Gateway

This project is a self-hosted API gateway that allows you to configure and route requests to different API endpoints. It provides a simple frontend interface to add API configurations and a backend server that dynamically routes requests based on the stored configurations.

## Prerequisites

- Python 3.x
- Node.js and npm (Node Package Manager)

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/cfreeman29/api-gateway.git
```
2. Navigate to the project directory:
```bash
cd api-gateway
```
### Backend Setup

1. Create a virtual environment for the Python backend:
```bash
python -m venv venv
```

2. Activate the virtual environment:
- For Unix/Linux:
  ```bash
  source venv/bin/activate
  ```
- For Windows:
  ```bash
  venv\Scripts\activate
  ```

3. Install the required Python packages:
```bash
pip install flask flask-cors requests
```
4. Start the backend server:
```bash
python app.py
```
The backend server will run on `http://localhost:3000`.

### Backend Setup (Alternative: Using conda)

1. Install Miniconda or Anaconda if you haven't already. You can download the appropriate version for your operating system from the official Miniconda or Anaconda website.

2. Open a terminal or command prompt.

3. Create a new conda environment for the project:
```bash
conda create --name api-gateway python=3.x
```
Replace `3.x` with the desired Python version (e.g., `3.9`).

4. Activate the conda environment:
```bash
conda activate api-gateway
```
5. Install the required Python packages:
```bash
pip install flask flask-cors requests
```
6. Start the backend server:
```bash
python app.py
```
The backend server will run on `http://localhost:3000`.

### Frontend Setup

1. Navigate to the `frontend` directory:
```bash
cd frontend
```
3. Start the frontend server:
```bash
node app.js
```

The frontend server will run on `http://localhost:8000`.


## Configuration

### MongoDB
The API gateway uses MongoDB to persist the API configurations. You can customize the MongoDB connection details by modifying the following constants in the `config.py` file:

- `MONGODB_URI`: The URI of the MongoDB server (default: 'mongodb://localhost:27017').
- `MONGODB_DB`: The name of the MongoDB database (default: 'api_gateway').
- `MONGODB_COLLECTION`: The name of the MongoDB collection to store the API configurations (default: 'api_configs').

Make sure to update these constants according to your MongoDB setup before running the API gateway.

## Usage

1. Open a web browser and navigate to `http://localhost:8000`.

2. You will see a simple form where you can enter the following details:
- Path: The path prefix for the API endpoint.
- API Endpoint: The full URL of the API endpoint.
- Bearer Token (optional): The bearer token for authentication, if required by the API.

3. Fill in the form with the desired API configuration and click the "Add Configuration" button.

4. The API configuration will be sent to the backend and stored.

5. To route requests through the API gateway, make a request to `http://localhost:3000/<path>`, where `<path>` matches the configured path prefix.

For example, if you configured an API endpoint with the path `/api/data` and the API endpoint `https://api.example.com/data`, making a request to `http://localhost:3000/api/data` will route the request to `https://api.example.com/data`.

6. If a bearer token is provided in the configuration, it will be included in the `Authorization` header of the routed request.

7. The API gateway will forward the response from the target API back to the client.

## Configuration

The API configurations are stored in memory within the Python backend. Each configuration consists of the following fields:
- Path: The path prefix for the API endpoint.
- API Endpoint: The full URL of the API endpoint.
- Bearer Token (optional): The bearer token for authentication, if required by the API.

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).