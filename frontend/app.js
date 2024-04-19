const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const session = require('express-session');
const MongoClient = require('mongodb').MongoClient;
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const secretKey = crypto.randomBytes(32).toString('hex');
const { ObjectId } = require('mongodb');
const ejs = require('ejs');

require('dotenv').config({ path: '../.env', override: true });

const backendURL = process.env.BACKEND_URL;
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION;

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

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
            // User is logged in, render the index page with the user object
            res.render('index', { user: req.session.user });
          } else if (!user) {
            // Admin user doesn't exist, render the create password page
            res.render('create-password', { user: null });
          } else {
            // Admin user exists, render the login page
            res.render('login', { user: null });
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
        // User is logged in, render the configure page with the user object
        res.render('configure', { user: req.session.user });
      } else {
        // User is not logged in, redirect to the login page
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
              res.json({ success: true });
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

    app.get('/users', (req, res) => {
      console.log('GET /users route');
      if (req.session.user) {
        // User is logged in, retrieve all users from the usersCollection
        usersCollection.find().toArray()
          .then((users) => {
            // Render the users page with the list of users and the user object
            res.render('users', { users, user: req.session.user });
          })
          .catch((err) => {
            console.error('Error retrieving users:', err);
            res.status(500).send('Internal Server Error');
          });
      } else {
        // User is not logged in, redirect to the login page
        res.redirect('/');
      }
    });

    app.post('/delete-user', (req, res) => {
      console.log('POST /delete-user route');
      if (req.session.user) {
        const { userId } = req.body;
    
        usersCollection.deleteOne({ _id: new ObjectId(userId) })
          .then((result) => {
            if (result.deletedCount === 1) {
              res.sendStatus(200);
            } else {
              res.sendStatus(404);
            }
          })
          .catch((err) => {
            console.error('Error deleting user:', err);
            res.sendStatus(500);
          });
      } else {
        res.sendStatus(401);
      }
    });
    
    app.use(bodyParser.json());
    app.post('/create-user', async (req, res) => {
      console.log('POST /create-user route');
      if (req.session.user) {
        const { username, password } = req.body;
        if (!password) {
          return res.status(400).json({ success: false, message: 'Password is required' });
        }
    
        try {
          // Check if the user already exists
          const existingUser = await usersCollection.findOne({ username });
          if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
          }
    
          // Hash the password
          const hash = await bcrypt.hash(password, 10);
    
          // Create the new user with the hashed password
          await usersCollection.insertOne({ username, password: hash });
          console.log('User created');
    
          // Send a success response
          res.json({ success: true, message: 'User created successfully' });
        } catch (err) {
          console.error('Error processing request:', err);
          res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
      } else {
        // User is not logged in, send an unauthorized response
        res.status(401).json({ success: false, message: 'Unauthorized' });
      }
    });

    app.get('/apis', (req, res) => {
      console.log('GET /apis route');
      if (req.session.user) {
        // User is logged in, retrieve API configurations from MongoDB
        api_configs_collection.find().toArray()
          .then((apiConfigs) => {
            // Render the apis page with the API configurations, user object, and deleteSuccess variable
            res.render('apis', {
              apiConfigs,
              user: req.session.user,
              deleteSuccess: req.query.deleteSuccess === 'true'
            });
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
        const user = await usersCollection.findOne({ username });

        if (!user) {
          // User doesn't exist, render the login page with an error message
          res.render('login', { user: null, errorMessage: 'User not found' });
        } else {
          // User exists, compare the provided password with the stored hash
          const isMatch = await bcrypt.compare(password, user.password);
          if (isMatch) {
            // Password is correct, set the session and redirect
            req.session.user = user;
            return res.redirect('/');
          } else {
            // Password is incorrect, render the login page with an error message
            res.render('login', { user: null, errorMessage: 'Invalid password' });
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

        axios.post(backendURL + '/configure', {
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