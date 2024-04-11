const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(8000, (err) => {
  if (err) {
    console.error('Error starting the server:', err);
    process.exit(1);
  }
  console.log('Server listening on port 8000');
});
