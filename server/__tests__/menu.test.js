const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const Category = require('../models/Category');
const Dish = require('../models/Dish');
const { app } = require('../server');

describe('Task 2 & 6 — Menu Endpoint Compatibility', () => {
  it('GET /api/menu returns categories, dishes, and count format expected by Person 2 frontend', async () => {
    // Stub or mock models in memory
    const originalCatFind = Category.find;
    const originalDishFind = Dish.find;

    Category.find = () => ({
      sort: () => ({
        lean: async () => [{ _id: 'cat-1', name: 'Grill', isActive: true, displayOrder: 1 }],
      }),
    });

    Dish.find = () => ({
      sort: () => ({
        lean: async () => [
          {
            dishId: 101,
            name: 'Smoked Lamb Chops',
            price: '₹950',
            priceNum: 950,
            desc: 'Fire grilled',
            image: '/images/lamb.jpg',
            category: 'Grill',
            isAvailable: true,
          },
        ],
      }),
    });

    try {
      const res = await request(app).get('/api/menu');
      assert.strictEqual(res.statusCode, 200);
      assert.ok(Array.isArray(res.body.categories));
      assert.ok(Array.isArray(res.body.dishes));
      assert.strictEqual(res.body.count, 1);
      assert.strictEqual(res.body.dishes[0].name, 'Smoked Lamb Chops');
      assert.strictEqual(res.body.dishes[0].priceNum, 950);
    } finally {
      Category.find = originalCatFind;
      Dish.find = originalDishFind;
    }
  });
});
