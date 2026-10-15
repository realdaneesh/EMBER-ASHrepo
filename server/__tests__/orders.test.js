const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const Order = require('../models/Order');
const Dish = require('../models/Dish');
const { app } = require('../server');

describe('Task 2 & 6 — Order Validation, Pricing Integrity & PII Protection', () => {
  it('validates order, recalculates prices server-side, overrides tampered client prices, and calculates 5% GST', async () => {
    const originalDishFind = Dish.find;
    const originalOrderSave = Order.prototype.save;
    const mongoose = require('mongoose');
    const originalReadyState = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

    // Mock genuine database dish
    Dish.find = () => ({
      lean: async () => [
        {
          dishId: 201,
          name: 'Charred Chicken Tikka',
          price: '₹500',
          priceNum: 500,
          image: '/images/tikka.jpg',
        },
      ],
    });

    // Mock save operation
    Order.prototype.save = async function () {
      return this;
    };

    try {
      const tamperedPayload = {
        tableNumber: 'Table 4',
        guestName: 'Jane Doe',
        notes: 'Less spicy',
        items: [
          {
            dishId: 201,
            name: 'Charred Chicken Tikka',
            priceNum: 1, // Client maliciously tampered price to 1!
            quantity: 2,
          },
        ],
        subtotal: 2, // Client maliciously tampered subtotal
        total: 2,    // Client maliciously tampered total
      };

      const res = await request(app)
        .post('/api/orders')
        .send(tamperedPayload);

      assert.strictEqual(res.statusCode, 201);
      // Server must override client price with genuine DB price 500
      assert.strictEqual(res.body.subtotal, 1000); // 500 * 2
      assert.strictEqual(res.body.gst, 50);        // 5% of 1000
      assert.strictEqual(res.body.total, 1050);    // 1000 + 50
      assert.strictEqual(res.body.items[0].priceNum, 500);
      assert.ok(res.body.orderId.startsWith('EA-LWP-'));
      assert.strictEqual(res.body.status, 'in_making');
      assert.strictEqual(res.body.tableNumber, 'Table 4');
    } finally {
      Dish.find = originalDishFind;
      Order.prototype.save = originalOrderSave;
      Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
    }
  });

  it('rejects order submission missing tableNumber', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        items: [{ dishId: 1, priceNum: 100, quantity: 1 }],
      });

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error);
  });

  it('rejects order submission with empty items array', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        tableNumber: '7',
        items: [],
      });

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error);
  });

  it('rejects order with invalid or negative item quantity', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        tableNumber: '7',
        items: [{ name: 'Bread', priceNum: 50, quantity: -3 }],
      });

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('Invalid quantity'));
  });

  it('protects GET /api/orders from unauthenticated access when ADMIN_API_KEY is configured', async () => {
    process.env.ADMIN_API_KEY = 'secret-test-token';

    try {
      // Missing key -> 401
      const unauthRes = await request(app).get('/api/orders');
      assert.strictEqual(unauthRes.statusCode, 401);

      // Wrong key -> 401
      const wrongRes = await request(app)
        .get('/api/orders')
        .set('x-admin-key', 'wrong-token');
      assert.strictEqual(wrongRes.statusCode, 401);

      // Valid key -> 200
      const originalFind = Order.find;
      Order.find = () => ({
        sort: () => ({
          limit: () => ({
            lean: async () => [{ orderId: 'EA-1', tableNumber: '1' }],
          }),
        }),
      });

      const validRes = await request(app)
        .get('/api/orders')
        .set('x-admin-key', 'secret-test-token');
      assert.strictEqual(validRes.statusCode, 200);
      assert.ok(Array.isArray(validRes.body));
      Order.find = originalFind;
    } finally {
      delete process.env.ADMIN_API_KEY;
    }
  });

  it('retries and succeeds when an orderId collision (E11000) occurs', async () => {
    let callCount = 0;
    const originalSave = Order.prototype.save;

    Order.prototype.save = async function () {
      callCount++;
      if (callCount === 1) {
        const duplicateErr = new Error('E11000 duplicate key error');
        duplicateErr.code = 11000;
        throw duplicateErr;
      }
      return this;
    };

    try {
      const res = await request(app)
        .post('/api/orders')
        .send({
          tableNumber: 'Table 9',
          items: [{ name: 'Kebab', priceNum: 300, quantity: 1 }],
        });

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(callCount, 2);
      assert.ok(res.body.orderId.startsWith('EA-LWP-'));
    } finally {
      Order.prototype.save = originalSave;
    }
  });
});
