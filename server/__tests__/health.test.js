const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');

describe('Task 1 — Health Endpoint & Connection Resilience', () => {
  it('returns HTTP 503 degraded status when MongoDB is disconnected', async () => {
    // If not connected, readyState is 0 (Disconnected)
    const originalReadyState = mongoose.connection.readyState;
    
    // Simulate disconnected state if currently not 0
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 0,
      configurable: true,
    });

    try {
      const res = await request(app).get('/api/health');
      assert.strictEqual(res.statusCode, 503);
      assert.strictEqual(res.body.status, 'degraded');
      assert.strictEqual(res.body.database, 'Disconnected');
      assert.ok(res.body.timestamp);
    } finally {
      // Restore
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: originalReadyState,
        configurable: true,
      });
    }
  });

  it('returns HTTP 200 ok status when MongoDB is connected', async () => {
    // Simulate connected state (readyState = 1)
    const originalReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 1,
      configurable: true,
    });

    try {
      const res = await request(app).get('/api/health');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.status, 'ok');
      assert.strictEqual(res.body.database, 'Connected');
      assert.ok(res.body.timestamp);
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: originalReadyState,
        configurable: true,
      });
    }
  });

  it('root /health endpoint reflects database state', async () => {
    const originalReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 1,
      configurable: true,
    });

    try {
      const res = await request(app).get('/health');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.status, 'ok');
    } finally {
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: originalReadyState,
        configurable: true,
      });
    }
  });
});
