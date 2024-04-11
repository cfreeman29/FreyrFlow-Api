const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const session = require('express-session');
const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const secretKey = crypto.randomBytes(32).toString('hex');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
  secret: secretKey,
  resave: false,
  saveUninitialized: false
}));

// MongoDB connection URL
const mongoURL = 'mongodb://localhost:3101';

// Connect to MongoDB
MongoClient.connect(mongoURL)
  .then((client) => {
    console.log('Connected to MongoDB');
    const db = client.db('api_gateway');
    const usersCollection = db.collection('users');

    app.get('/', (req, res) => {
      console.log('GET / route');
      usersCollection.findOne({ username: 'admin' })
        .then(user => {
          if (req.session.user) {
            // User is logged in, render the configuration page
            res.send(`<!DOCTYPE html><html><head><title>API Gateway Configuration</title><link rel="stylesheet" type="text/css" href="/styles.css"></head><body><div class="container"><h1>API Gateway Configuration</h1><form id="configForm" action="/configure" method="post"><div class="form-group"><label for="path">Path:</label><input type="text" id="path" name="path" required></div><div class="form-group"><label for="endpoint">API Endpoint:</label><input type="text" id="endpoint" name="endpoint" required></div><div class="form-group"><label for="bearerToken">Bearer Token (optional):</label><input type="text" id="bearerToken" name="bearer_token"></div><button type="submit" class="btn">Add Configuration</button></form><a href="/logout" class="logout-link">Logout</a></div></body></html>`);
          } else if (!user) {
            // Admin user doesn't exist, render the create password page
            res.send(`<!DOCTYPE html><html><head><title>Create Password</title><link rel="stylesheet" type="text/css" href="/styles.css"></head><body><div class="container"><h1>Create Password</h1><p>Please create a password for the admin user.</p><form id="createPasswordForm" action="/create-password" method="post"><div class="form-group"><label for="password">Password:</label><input type="password" id="password" name="password" required></div><button type="submit" class="btn">Create Password</button></form></div></body></html>`);
          } else {
            // Admin user exists, render the login page
            res.send(`<!DOCTYPE html><html><head><title>Login</title><link rel="stylesheet" type="text/css" href="/styles.css"></head><body><div class="container"><h1>Login</h1><form id="loginForm" action="/login" method="post"><div class="form-group"><label for="username">Username:</label><input type="text" id="username" name="username" required></div><div class="form-group"><label for="password">Password:</label><input type="password" id="password" name="password" required></div><button type="submit" class="btn">Login</button></form></div></body></html>`);
          }
        })
        .catch(err => {
          console.error('Database query error:', err);
          res.status(500).send('Internal Server Error');
        });
    });
            

    app.post('/login', async (req, res) => {
    console.log('POST /login route');
    const { username, password } = req.body;

    try {
      const user = await usersCollection.findOne({ username: 'admin' });

      if (!user) {
          // Admin user doesn't exist, render the create password page
          return res.redirect('/create-password');
      } else {
          // Admin user exists, compare the provided password with the stored hash
          const isMatch = await bcrypt.compare(password, user.password);
          if (isMatch) {
              // Password is correct, set the session and redirect
              req.session.user = user;
              return res.redirect('/');
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
      }
  } catch (err) {
      console.error('Error processing login:', err);
      res.status(500).send('Internal Server Error');
  }
});
    

  app.post('/create-password', async (req, res) => {
    console.log('POST /create-password route');
    const { password } = req.body;

    try {
        // Hash the password
        const hash = await bcrypt.hash(password, 10);

        // Create the admin user with the hashed password
        await usersCollection.insertOne({ username: 'admin', password: hash });
        console.log('Admin user created, redirecting...');
        
        // Admin user created, redirect to the login page
        res.redirect('/');
    } catch (err) {
        console.error('Error processing request:', err);
        res.status(500).send('Internal Server Error');
    }
});

  app.get('/logout', (req, res) => {
    console.log('GET /logout route');
    // Destroy the session and redirect to the login page
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
      res.redirect('/');
    });
  });

  app.post('/configure', (req, res) => {
    console.log('POST /configure route');
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

  console.log('Starting server...');

    app.listen(8001, (err) => {
      if (err) {
        console.error('Error starting the server:', err);
        process.exit(1);
      }
      console.log('Frontend server is running on port 8000');
    });
    console.log('Server startup complete');
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

