const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, connectDatabase } = require('../server');

describe('Task 1 & 6 — Server Configuration, CORS & Startup Handling', () => {
  it('connectDatabase throws critical error in production when MONGO_URI is missing', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      await assert.rejects(
        async () => {
          await connectDatabase('');
        },
        {
          name: 'Error',
          message: /CRITICAL: MONGO_URI environment variable is required/,
        }
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('express trust proxy is set to loopback for secure reverse proxy rate limiting', () => {
    assert.strictEqual(app.get('trust proxy'), 'loopback');
  });

  it('allows requests from localhost:3000 CORS origin in development/test', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:3000');

    assert.strictEqual(res.headers['access-control-allow-origin'], 'http://localhost:3000');
  });

  it('enforces strict explicit origins in production mode (rejects undeclared localhost)', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalOrigins = process.env.FRONTEND_ORIGIN;
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_ORIGIN = 'https://emberandash.com';

    try {
      // Allowed declared production domain
      const allowedRes = await request(app)
        .get('/health')
        .set('Origin', 'https://emberandash.com');
      assert.strictEqual(allowedRes.headers['access-control-allow-origin'], 'https://emberandash.com');

      // Undeclared localhost rejected in production
      const localRes = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');
      assert.notStrictEqual(localRes.headers['access-control-allow-origin'], 'http://localhost:3000');

      // Unconfigured arbitrary amplifyapp domain rejected in production
      const amplifyRes = await request(app)
        .get('/health')
        .set('Origin', 'https://unauthorized.amplifyapp.com');
      assert.notStrictEqual(amplifyRes.headers['access-control-allow-origin'], 'https://unauthorized.amplifyapp.com');
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalOrigins !== undefined) {
        process.env.FRONTEND_ORIGIN = originalOrigins;
      } else {
        delete process.env.FRONTEND_ORIGIN;
      }
    }
  });

  it('rejects CORS for unauthorized untrusted origins', async () => {
    const evilOrigin = 'https://malicious-phishing-site.com';
    const res = await request(app)
      .get('/api/menu')
      .set('Origin', evilOrigin);

    assert.notStrictEqual(res.headers['access-control-allow-origin'], evilOrigin);
  });
});
