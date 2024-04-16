const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const session = require('express-session');
const MongoClient = require('mongodb').MongoClient;
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const secretKey = crypto.randomBytes(32).toString('hex');
const fs = require('fs');
const { ObjectId } = require('mongodb');
require('dotenv').config({ path: '../.env' });

const backendURL = process.env.BACKEND_URL;
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION;

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// MongoDB connection URL
const mongoURL = MONGODB_URI;


app.use(session({
  secret: secretKey,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
      mongoUrl: mongoURL,
      collectionName: 'sessions'
  }),
  cookie: {
      secure: false, // set to true if you're using HTTPS
      httpOnly: true, // Minimize risk of XSS attacks by restricting the client from reading the cookie
      maxAge: 1000 * 60 * 60 * 24 // e.g., 1 day
  }
}));

// Connect to MongoDB
MongoClient.connect(mongoURL)
  .then((client) => {
    console.log('Connected to MongoDB');
    const db = client.db(MONGODB_DB);
    const usersCollection = db.collection('users');
    const api_configs_collection = db.collection(MONGODB_COLLECTION);

    app.get('/', (req, res) => {
      console.log('GET / route');
      usersCollection.findOne({ username: 'admin' })
        .then(user => {
          if (req.session.user) {
            // User is logged in, render the configuration page
            res.send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>API Gateway - Welcome</title>
              <link rel="stylesheet" type="text/css" href="/styles.css">
            </head>
            <body>
              ${fs.readFileSync('navbar.html')}
              <div class="container">
                <h1>Welcome to the API Gateway</h1>
                <p>Welcome to the API Gateway! Here you can manage your API routes and configurations.</p>
                </div>
              </div>
            </body>
            </html>
          `);
          } else if (!user) {
            // Admin user doesn't exist, render the create password page
            res.send(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Create Password</title>
                  <link rel="stylesheet" type="text/css" href="/styles.css">
                </head>
                <body>
                  ${fs.readFileSync('navbar.html')}
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
          } else {
            // Admin user exists, render the login page
            res.send(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Login</title>
                  <link rel="stylesheet" type="text/css" href="/styles.css">
                </head>
                <body>
                  ${fs.readFileSync('navbar.html')}
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
        })
        .catch(err => {
          console.error('Database query error:', err);
          res.status(500).send('Internal Server Error');
        });
    });
    
    app.get('/configure-api', (req, res) => {
      console.log('GET /configure-api route');
      if (req.session.user) {
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>API Gateway Configuration</title>
              <link rel="stylesheet" type="text/css" href="/styles.css">
            </head>
            <body>
              ${fs.readFileSync('navbar.html')}
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
                <div id="successMessage" class="success-message hidden">API configuration added successfully!</div>
              </div>
              <script>
                document.addEventListener('DOMContentLoaded', function() {
                  const configForm = document.getElementById('configForm');
                  const successMessage = document.getElementById('successMessage');
    
                  configForm.addEventListener('submit', function(event) {
                    event.preventDefault();
    
                    const formData = new FormData(configForm);
                    const data = Object.fromEntries(formData.entries());
    
                    fetch('/configure', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(data)
                    })
                    .then(response => response.json())
                    .then(result => {
                      successMessage.classList.remove('hidden');
                      configForm.reset();
                      setTimeout(() => {
                        successMessage.classList.add('hidden');
                      }, 3000);
                    })
                    .catch(error => {
                      console.error('Error:', error);
                    });
                  });
                });
              </script>
            </body>
          </html>
        `);
      } else {
        res.redirect('/');
      }
    });
    
    app.post('/delete-api', (req, res) => {
      console.log('POST /delete-api route');
      if (req.session.user) {
        const { configId } = req.body;
    
        api_configs_collection.deleteOne({ _id: new ObjectId(configId) })
          .then((result) => {
            if (result.deletedCount === 1) {
              res.json({ success: true, message: 'API configuration deleted successfully' });
            } else {
              res.json({ success: false, message: 'Failed to delete API configuration' });
            }
          })
          .catch((err) => {
            console.error('Error deleting API configuration:', err);
            res.status(500).json({ success: false, message: 'An error occurred while deleting the API configuration' });
          });
      } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
      }
    });

    app.get('/apis', (req, res) => {
      console.log('GET /apis route');
      if (req.session.user) {
        // User is logged in, retrieve API configurations from MongoDB
        api_configs_collection.find().toArray()
          .then((apiConfigs) => {
            // Render the routes page with the API configurations
            try {
              const html = `
              <!DOCTYPE html>
              <html>
              <head>
                <title>API Routes</title>
                <link rel="stylesheet" type="text/css" href="/styles.css">
                <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
              </head>
              <body>
                ${fs.readFileSync('navbar.html')}
                <div class="container">
                  <div class="header">
                    <h1>API Routes</h1>
                    <button id="toggleTokensBtn">Unhide Tokens</button>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Path</th>
                        <th>Endpoint</th>
                        <th>Bearer Token</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${apiConfigs.map((config, index) => `
                        <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
                          <td>${config.path}</td>
                          <td>${config.endpoint}</td>
                          <td class="bearer-token-cell">
                            <span class="hidden-token">************</span>
                            <span class="visible-token">${config.bearer_token || ''}</span>
                          </td>
                          <td>
                            <button class="delete-btn" data-config-id="${config._id}">Delete</button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  <div id="successMessage" class="success-message hidden"></div>
                </div>
                <script>
                  document.addEventListener('DOMContentLoaded', function() {
                    const toggleTokensBtn = document.getElementById('toggleTokensBtn');
                    const hiddenTokens = document.querySelectorAll('.hidden-token');
                    const visibleTokens = document.querySelectorAll('.visible-token');
                    
                    toggleTokensBtn.addEventListener('click', function() {
                      hiddenTokens.forEach(function(token) {
                        token.classList.toggle('hidden');
                      });
                      visibleTokens.forEach(function(token) {
                        token.classList.toggle('hidden');
                      });
                      toggleTokensBtn.textContent = toggleTokensBtn.textContent === 'Unhide Tokens' ? 'Hide Tokens' : 'Unhide Tokens';
                    });
                    
                    // Step 3: Client-side JavaScript to handle delete functionality
                    const deleteButtons = document.querySelectorAll('.delete-btn');
                    const successMessage = document.getElementById('successMessage');
                    
                    deleteButtons.forEach(function(button) {
                      button.addEventListener('click', function() {
                        const configId = this.getAttribute('data-config-id');
                        const confirmDelete = confirm('Are you sure you want to delete this API configuration?');
                        
                        if (confirmDelete) {
                          fetch('/delete-api', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ configId: configId })
                          })
                          .then(response => response.json())
                          .then(result => {
                            if (result.success) {
                              // Display success message
                              successMessage.textContent = 'API configuration deleted successfully!';
                              successMessage.classList.remove('hidden');
                              
                              // Hide success message after 3 seconds
                              setTimeout(() => {
                                successMessage.classList.add('hidden');
                              }, 3000);
                              
                              // Remove the deleted row from the table
                              const row = button.closest('tr');
                              row.remove();
                            } else {
                              alert('Failed to delete API configuration');
                            }
                          })
                          .catch(error => {
                            console.error('Error:', error);
                            alert('An error occurred while deleting the API configuration');
                          });
                        }
                      });
                    });
                  });
                </script>
              </body>
              </html>
              `;
              res.send(html);
            } catch (error) {
              console.error('Error rendering routes page:', error);
              res.status(500).send('Internal Server Error');
            }
          })
          .catch((err) => {
            console.error('Error retrieving API configurations:', err);
            res.status(500).send('Internal Server Error');
          });
      } else {
        // User is not logged in, redirect to the login page
        res.redirect('/');
      }
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
                ${fs.readFileSync('navbar.html')}
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

      axios.post(backendURL, {
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

    app.listen(8000, (err) => {
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