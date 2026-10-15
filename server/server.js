const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api');

// Configuration
const PORT = parseInt(process.env.PORT, 10) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGO_URI = process.env.MONGO_URI;

// DNS configuration:
// Unconditional override removed for production (Amazon Linux EC2 uses AWS VPC DNS).
// Demonstrated need: Local Windows development frequently rejects MongoDB Atlas SRV queries (querySrv ECONNREFUSED).
if (process.env.ENABLE_CUSTOM_DNS === 'true' || (NODE_ENV !== 'production' && process.platform === 'win32')) {
  try {
    const dns = require('dns');
    const servers = (process.env.CUSTOM_DNS_SERVERS || '8.8.8.8,1.1.1.1').split(',').map((s) => s.trim());
    dns.setServers(servers);
    console.info(`[DNS] Applied demonstrated local DNS fallback for Atlas SRV: ${servers.join(', ')}`);
  } catch (e) {
    console.warn('[DNS] Failed to set fallback DNS servers:', e.message);
  }
}

const app = express();

// Trust proxy configuration:
// When deployed behind local Nginx reverse proxy on EC2, trust loopback (127.0.0.1, ::1).
// This prevents spoofed client X-Forwarded-For headers from bypassing rate limiting.
app.set('trust proxy', 'loopback');

// Security & request size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Helper to determine allowed CORS origins based on environment
function getAllowedOrigins() {
  const currentEnv = process.env.NODE_ENV || 'development';
  const origins = [];

  if (process.env.FRONTEND_ORIGIN) {
    const configured = process.env.FRONTEND_ORIGIN
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o && o !== '*');
    origins.push(...configured);
  }

  // Local development origins permitted only outside production
  if (currentEnv !== 'production') {
    origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }

  return origins;
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, server-to-server, health check probes)
    if (!origin) return callback(null, true);

    const allowed = getAllowedOrigins();
    const currentEnv = process.env.NODE_ENV || 'development';

    if (allowed.includes(origin)) {
      return callback(null, true);
    }

    // In development or test mode only, allow AWS Amplify preview domains for staging
    if (currentEnv !== 'production' && /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.amplifyapp\.com$/.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS error: Origin ${origin} is not allowed by policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
};

app.use(cors(corsOptions));

// Health check endpoint at root level
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    database: states[dbState] || 'Unknown',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    name: 'Ember & Ash Backend API',
    status: 'online',
    version: '1.0.0',
    environment: NODE_ENV,
  });
});

// Mount API routes
app.use('/api', apiRoutes);

// Central error handler (Never leak internal stack traces)
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err.message);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: NODE_ENV === 'production' ? 'An unexpected server error occurred' : err.message,
  });
});

// Database connection management
const mongooseOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

mongoose.connection.on('connected', () => {
  console.info('✅ Connected to MongoDB successfully!');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB Connection Error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected.');
});

async function connectDatabase(uri) {
  const targetUri = uri !== undefined ? uri : process.env.MONGO_URI;
  const currentEnv = process.env.NODE_ENV || 'development';

  if (!targetUri) {
    const errorMsg = 'CRITICAL: MONGO_URI environment variable is required.';
    if (currentEnv === 'production') {
      console.error(`[FATAL] ${errorMsg}`);
      throw new Error(errorMsg);
    } else {
      console.warn(`\n⚠️  WARNING: ${errorMsg}`);
      console.warn('The server is running in development mode without an active database.\n');
      return false;
    }
  }

  try {
    console.info('Connecting to MongoDB...');
    await mongoose.connect(targetUri, mongooseOptions);
    return true;
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    if (currentEnv === 'production') {
      throw err;
    }
    return false;
  }
}

let serverInstance = null;

async function startServer() {
  try {
    await connectDatabase();
  } catch (err) {
    if (NODE_ENV === 'production') {
      console.error('[FATAL] Aborting server launch due to database failure in production:', err.message);
      process.exit(1);
    }
  }

  return new Promise((resolve) => {
    serverInstance = app.listen(PORT, () => {
      console.info(`🚀 Ember & Ash API Server listening at http://localhost:${PORT} [${NODE_ENV}]`);
      resolve(serverInstance);
    });
  });
}

// Graceful shutdown handling
async function shutdown(signal) {
  console.info(`\n[Shutdown] Received ${signal}. Closing server gracefully...`);

  if (serverInstance) {
    serverInstance.close(async () => {
      console.info('[Shutdown] HTTP server closed.');
      try {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.connection.close(false);
          console.info('[Shutdown] MongoDB connection cleanly closed.');
        }
        process.exit(0);
      } catch (err) {
        console.error('[Shutdown Error] Failed to close MongoDB:', err.message);
        process.exit(1);
      }
    });

    // Forced exit timeout after 10s if connections linger
    setTimeout(() => {
      console.error('[Shutdown] Forced termination after timeout.');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Auto-start when executed directly from command line
if (require.main === module) {
  startServer().catch((err) => {
    console.error('[Startup Error]', err);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer,
  connectDatabase,
  shutdown,
};
