// Load environment variables from .env file
require('dotenv').config();

// Import required packages
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path'); // For handling file paths

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON
app.use(bodyParser.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1); // Exit if MongoDB connection fails
  });

// Define the main route
app.get('/', (req, res) => {
  res.send('Welcome to the Emotion Analysis API!');
});

// Import and use the main routes (ensure routes/index.js exists)
try {
  app.use('/api', require(path.join(__dirname, 'routes', 'index')));
} catch (err) {
  console.error('Error loading routes:', err.message);
}

// Add the user routes
try {
  app.use('/api/users', require('./routes/users'));
} catch (err) {
  console.error('Error loading user routes:', err.message);
}

// Add the diary routes
try {
  app.use('/api/diary_route', require('./routes/diary_route')); // Add Diary routes here
} catch (err) {
  console.error('Error loading diary routes:', err.message);
}

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
