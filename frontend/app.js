const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>API Gateway Configuration</title>
      <link rel="stylesheet" type="text/css" href="/styles.css">
    </head>
    <body>
      <div class="container">
        <h1>API Gateway Configuration</h1>
        <form id="configForm" action="/configure" method="post">
          <div class="form-group">
            <label for="path">Path:</label>
            <input type="text" id="path" name="path" required>
          </div>
          <div class="form-group">
            <label for="endpoint">API Endpoint:</label>
            <input type="text" id="endpoint" name="endpoint" required>
          </div>
          <div class="form-group">
            <label for="bearerToken">Bearer Token (optional):</label>
            <input type="text" id="bearerToken" name="bearer_token">
          </div>
          <button type="submit" class="btn">Add Configuration</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

app.post('/configure', (req, res) => {
  const { path, endpoint, bearer_token } = req.body;

  axios.post('http://localhost:3000/configure', {
    path,
    endpoint,
    bearer_token
  })
  .then(response => {
    res.send(response.data);
  })
  .catch(error => {
    console.error('Error:', error);
    res.status(500).send('An error occurred while adding the configuration.');
  });
});

app.listen(8000, () => {
  console.log('Frontend server is running on port 8000');
});