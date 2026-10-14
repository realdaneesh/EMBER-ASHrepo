const express = require('express');
const router = express.Router();

const Dish = require('../models/Dish');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Reservation = require('../models/Reservation');

// @route   GET /api/health
// @desc    Check API and Database status
router.get('/health', async (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState;
  const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  res.json({
    status: 'ok',
    database: states[dbState] || 'Unknown',
    timestamp: new Date().toISOString(),
  });
});

// @route   GET /api/menu
// @desc    Get all categories and menu dishes
router.get('/menu', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1 });
    const dishes = await Dish.find({ isAvailable: true }).sort({ dishId: 1 });

    res.json({
      categories,
      dishes,
      count: dishes.length,
    });
  } catch (err) {
    console.error('Error fetching menu:', err);
    res.status(500).json({ error: 'Failed to fetch menu items from database' });
  }
});

// @route   POST /api/orders
// @desc    Create a new table order
router.post('/orders', async (req, res) => {
  try {
    const { tableNumber, guestName, notes, items, total, subtotal, gst } = req.body;

    if (!tableNumber || !items || !items.length) {
      return res.status(400).json({ error: 'Table number and order items are required.' });
    }

    const orderId = `EA-LWP-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = new Order({
      orderId,
      tableNumber: String(tableNumber).trim(),
      guestName: guestName ? guestName.trim() : 'Guest',
      notes: notes ? notes.trim() : '',
      items,
      subtotal: subtotal || 0,
      gst: gst || 0,
      total,
      timePlaced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'in_making',
    });

    const savedOrder = await newOrder.save();
    console.log(`[Order Saved] ID: ${savedOrder.orderId} for Table ${savedOrder.tableNumber}`);
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error('Error placing order:', err);
    res.status(500).json({ error: 'Failed to record table order in database' });
  }
});

// @route   GET /api/orders
// @desc    Get recent orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(20);
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// @route   POST /api/reservations
// @desc    Submit a table reservation
router.post('/reservations', async (req, res) => {
  try {
    const { name, email, phone, date, time, guests, specialRequests } = req.body;

    if (!name || !email || !phone || !date || !time) {
      return res.status(400).json({ error: 'Please provide all required reservation fields.' });
    }

    const reservationCode = `RES-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const reservation = new Reservation({
      reservationCode,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      date,
      time,
      guests: Number(guests) || 2,
      specialRequests: specialRequests ? specialRequests.trim() : '',
      status: 'confirmed',
    });

    const saved = await reservation.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error saving reservation:', err);
    res.status(500).json({ error: 'Failed to save reservation' });
  }
});

module.exports = router;
