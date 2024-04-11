const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send(`
    <h1>API Gateway Configuration</h1>
    <form action="/configure" method="post">
      <label for="path">Path:</label>
      <input type="text" id="path" name="path" required><br>
      
      <label for="endpoint">API Endpoint:</label>
      <input type="text" id="endpoint" name="endpoint" required><br>
      
      <label for="bearerToken">Bearer Token:</label>
      <input type="text" id="bearerToken" name="bearer_token" required><br>
      
      <button type="submit">Add Configuration</button>
    </form>
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