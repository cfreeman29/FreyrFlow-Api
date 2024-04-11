const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const session = require('express-session');
const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcrypt');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

// MongoDB connection URL
const mongoURL = 'mongodb://localhost:3101';

// Connect to MongoDB
MongoClient.connect(mongoURL, { useUnifiedTopology: true }, (err, client) => {
  if (err) {
    console.error('Error connecting to MongoDB:', err);
    return;
  }

  console.log('Connected to MongoDB');
  const db = client.db('api_gateway');
  const usersCollection = db.collection('users');

  app.get('/', (req, res) => {
    if (req.session.user) {
      // User is logged in, render the configuration page
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
            <a href="/logout" class="logout-link">Logout</a>
          </div>
        </body>
        </html>
      `);
    } else {
      // User is not logged in, render the login page
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Login</title>
          <link rel="stylesheet" type="text/css" href="/styles.css">
        </head>
        <body>
          <div class="container">
            <h1>Login</h1>
            <form id="loginForm" action="/login" method="post">
              <div class="form-group">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required>
              </div>
              <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
              </div>
              <button type="submit" class="btn">Login</button>
            </form>
          </div>
        </body>
        </html>
      `);
    }
  });

  app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Check if the admin user exists in the database
    usersCollection.findOne({ username: 'admin' }, (err, user) => {
      if (err) {
        console.error('Error finding user:', err);
        res.status(500).send('Internal Server Error');
        return;
      }

      if (user) {
        // Admin user exists, compare the provided password with the stored hash
        bcrypt.compare(password, user.password, (err, result) => {
          if (err) {
            console.error('Error comparing passwords:', err);
            res.status(500).send('Internal Server Error');
            return;
          }

          if (result) {
            // Password is correct, set the session and redirect to the configuration page
            req.session.user = user;
            res.redirect('/');
          } else {
            // Password is incorrect, render the login page with an error message
            res.send(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Login</title>
                <link rel="stylesheet" type="text/css" href="/styles.css">
              </head>
              <body>
                <div class="container">
                  <h1>Login</h1>
                  <p class="error-message">Invalid username or password</p>
                  <form id="loginForm" action="/login" method="post">
                    <div class="form-group">
                      <label for="username">Username:</label>
                      <input type="text" id="username" name="username" required>
                    </div>
                    <div class="form-group">
                      <label for="password">Password:</label>
                      <input type="password" id="password" name="password" required>
                    </div>
                    <button type="submit" class="btn">Login</button>
                  </form>
                </div>
              </body>
              </html>
            `);
          }
        });
      } else {
        // Admin user doesn't exist, render the create password page
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Create Password</title>
            <link rel="stylesheet" type="text/css" href="/styles.css">
          </head>
          <body>
            <div class="container">
              <h1>Create Password</h1>
              <p>Please create a password for the admin user.</p>
              <form id="createPasswordForm" action="/create-password" method="post">
                <div class="form-group">
                  <label for="password">Password:</label>
                  <input type="password" id="password" name="password" required>
                </div>
                <button type="submit" class="btn">Create Password</button>
              </form>
            </div>
          </body>
          </html>
        `);
      }
    });
  });

  app.post('/create-password', (req, res) => {
    const { password } = req.body;

    // Hash the password
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        res.status(500).send('Internal Server Error');
        return;
      }

      // Create the admin user with the hashed password
      usersCollection.insertOne({ username: 'admin', password: hash }, (err, result) => {
        if (err) {
          console.error('Error creating admin user:', err);
          res.status(500).send('Internal Server Error');
          return;
        }

        // Admin user created, redirect to the login page
        res.redirect('/');
      });
    });
  });

  app.get('/logout', (req, res) => {
    // Destroy the session and redirect to the login page
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
      res.redirect('/');
    });
  });

  app.post('/configure', (req, res) => {
    if (req.session.user) {
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
    } else {
      // User is not logged in, redirect to the login page
      res.redirect('/');
    }
  });

  app.listen(8000, () => {
    console.log('Frontend server is running on port 8000');
  });
});