const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
require('dotenv').config();

// Ensure reliable DNS resolution for MongoDB Atlas SRV records on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // fallback to system default
}

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('🔥 Ember & Ash API Server is running');
});

// Database Connection & Server Start
async function startServer() {
  if (!MONGO_URI) {
    console.warn('\n⚠️  WARNING: MONGO_URI is not set in .env.');
    console.warn('The server will start, but database operations will fail until you provide a MongoDB connection string.\n');
  } else {
    try {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(MONGO_URI);
      console.log('✅ Connected to MongoDB successfully!');
    } catch (err) {
      console.error('❌ MongoDB Connection Error:', err.message);
    }
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server listening at http://localhost:${PORT}`);
  });
}

startServer();
