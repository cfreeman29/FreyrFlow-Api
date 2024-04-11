const MongoClient = require('mongodb').MongoClient;
const mongoURL = 'mongodb://localhost:3101';

MongoClient.connect(mongoURL)
  .then((client) => {
    console.log('Connected to MongoDB');
    const db = client.db('api_gateway');
    const usersCollection = db.collection('users');
    // ...
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });