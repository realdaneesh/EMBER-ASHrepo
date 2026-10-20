const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const Dish = require('../models/Dish');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Reservation = require('../models/Reservation');
const { sendReservationAcknowledgement, sendOrderConfirmation, maskEmail } = require('../services/email');

// Rate limiter for write endpoints (orders & reservations)
const isTestEnv = process.env.NODE_ENV === 'test';
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 2000 : 30, // 30 requests per 15 min in production
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Please try again later.' },
});

// Helper: Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper: Save document with collision retry for unique identifier conflicts (E11000)
async function saveWithCollisionRetry(createDocFn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const doc = createDocFn();
      return await doc.save();
    } catch (err) {
      if (err.code === 11000 && attempt < maxRetries) {
        console.warn(`[Unique Collision] Duplicate key encountered (attempt ${attempt}/${maxRetries}). Retrying with new random code...`);
        continue;
      }
      throw err;
    }
  }
}

// Helper: Date validation (must not be in the past)
function isValidFutureOrTodayDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  const parsed = new Date(dateString);
  if (isNaN(parsed.getTime())) return false;

  // Compare to start of current day in local/UTC
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if date is at least today
  const targetDate = new Date(parsed);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate >= today;
}

// @route   GET /api/health
// @desc    Check API and Database status (returns 503 if DB disconnected)
router.get('/health', async (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState;
  const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  const isHealthy = dbState === 1;

  const payload = {
    status: isHealthy ? 'ok' : 'degraded',
    database: states[dbState] || 'Unknown',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  if (!isHealthy) {
    return res.status(503).json(payload);
  }

  res.status(200).json(payload);
});

// @route   GET /api/menu
// @desc    Get all categories and menu dishes
router.get('/menu', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1 }).lean();
    const dishes = await Dish.find({ isAvailable: true }).sort({ dishId: 1 }).lean();

    res.json({
      categories,
      dishes,
      count: dishes.length,
    });
  } catch (err) {
    console.error('Error fetching menu items:', err.message);
    res.status(500).json({ error: 'Failed to fetch menu items from database' });
  }
});

// @route   POST /api/orders
// @desc    Create a new table order with server-side price & total validation
router.post('/orders', writeLimiter, async (req, res) => {
  try {
    const { tableNumber, guestName, guestEmail, email, notes, items } = req.body;
    const rawEmail = guestEmail || email;
    const cleanEmail = rawEmail && typeof rawEmail === 'string' && EMAIL_REGEX.test(rawEmail.trim())
      ? rawEmail.trim().toLowerCase().slice(0, 255)
      : '';

    // Validate table number
    if (!tableNumber || typeof tableNumber !== 'string' && typeof tableNumber !== 'number') {
      return res.status(400).json({ error: 'Valid table number is required.' });
    }
    const cleanTable = String(tableNumber).trim().slice(0, 20);
    if (!cleanTable) {
      return res.status(400).json({ error: 'Table number cannot be empty.' });
    }

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item.' });
    }
    if (items.length > 50) {
      return res.status(400).json({ error: 'Order exceeds maximum allowed 50 items.' });
    }

    // Fetch official dish details from database to avoid trusting client prices
    const dishIds = items.map((i) => Number(i.dishId)).filter((id) => !isNaN(id));
    const dishNames = items.map((i) => String(i.name || '').trim()).filter(Boolean);

    let dbDishes = [];
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      try {
        dbDishes = await Dish.find({
          $or: [
            { dishId: { $in: dishIds } },
            { name: { $in: dishNames } },
          ],
        }).lean();
      } catch (e) {
        // In case Dish lookup fails, proceed with strict fallback validation
        console.warn('Dish collection query bypassed:', e.message);
      }
    }

    const dishLookup = new Map();
    for (const d of dbDishes) {
      if (d.dishId) dishLookup.set(String(d.dishId), d);
      if (d.name) dishLookup.set(d.name.toLowerCase(), d);
    }

    const verifiedItems = [];
    let calculatedSubtotal = 0;

    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty < 1 || qty > 20) {
        return res.status(400).json({ error: `Invalid quantity for item "${item.name || 'unnamed'}". Must be between 1 and 20.` });
      }

      const lookupKeyId = item.dishId ? String(item.dishId) : null;
      const lookupKeyName = item.name ? String(item.name).trim().toLowerCase() : null;
      const dbDish = (lookupKeyId && dishLookup.get(lookupKeyId)) || (lookupKeyName && dishLookup.get(lookupKeyName));

      let priceNum;
      let itemName;
      let dishId;
      let image;

      if (dbDish) {
        // Enforce genuine database price and details
        priceNum = Number(dbDish.priceNum);
        itemName = dbDish.name;
        dishId = dbDish.dishId || item.dishId;
        image = dbDish.image || item.image || '';
      } else {
        // Fallback for custom or seed/mock items: validate priceNum is positive finite number
        priceNum = Number(item.priceNum);
        if (isNaN(priceNum) || priceNum <= 0 || priceNum > 50000) {
          return res.status(400).json({ error: `Invalid item price for "${item.name || 'dish'}".` });
        }
        itemName = String(item.name || 'Special Item').trim().slice(0, 100);
        dishId = Number(item.dishId) || null;
        image = typeof item.image === 'string' ? item.image.slice(0, 255) : '';
      }

      const lineTotal = priceNum * qty;
      calculatedSubtotal += lineTotal;

      verifiedItems.push({
        dishId,
        name: itemName,
        price: `₹${priceNum}`,
        priceNum,
        image,
        quantity: qty,
      });
    }

    // Recalculate official totals (5% GST standard)
    const verifiedGst = Math.round(calculatedSubtotal * 0.05 * 100) / 100;
    const verifiedTotal = Math.round((calculatedSubtotal + verifiedGst) * 100) / 100;

    // Save with unique orderId generation and collision retry
    const savedOrder = await saveWithCollisionRetry(() => {
      const orderId = `EA-LWP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      return new Order({
        orderId,
        tableNumber: cleanTable,
        guestName: guestName && typeof guestName === 'string' ? guestName.trim().slice(0, 100) : 'Guest',
        guestEmail: cleanEmail,
        notes: notes && typeof notes === 'string' ? notes.trim().slice(0, 300) : '',
        items: verifiedItems,
        subtotal: calculatedSubtotal,
        gst: verifiedGst,
        total: verifiedTotal,
        timePlaced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'in_making',
        emailNotificationStatus: 'not_attempted',
      });
    });

    console.info(`[Order Placed] ID: ${savedOrder.orderId} for Table ${savedOrder.tableNumber} (Total: ₹${verifiedTotal}${cleanEmail ? `, Email: ${maskEmail(cleanEmail)}` : ''})`);

    // Dispatch Amazon SES order confirmation asynchronously without blocking or reversing the order
    if (cleanEmail) {
      sendOrderConfirmation({
        orderId: savedOrder.orderId,
        tableNumber: savedOrder.tableNumber,
        guestName: savedOrder.guestName,
        email: cleanEmail,
        items: savedOrder.items,
        subtotal: savedOrder.subtotal,
        gst: savedOrder.gst,
        total: savedOrder.total,
        notes: savedOrder.notes,
        timePlaced: savedOrder.timePlaced,
      }).then(async (emailResult) => {
        try {
          if (emailResult.status) {
            savedOrder.emailNotificationStatus = emailResult.status;
            await savedOrder.save();
          }
        } catch (saveErr) {
          // Non-critical background save failure
        }
      }).catch((err) => {
        console.error(`[SES Order Background Error] ${err.message}`);
      });
    }

    // Return saved order object to preserve existing frontend compatibility
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error('Error placing order:', err.message);
    res.status(500).json({ error: 'Failed to record table order in database' });
  }
});

// @route   GET /api/orders
// @desc    Get recent orders (Protected by Admin API Key to prevent PII exposure)
router.get('/orders', async (req, res) => {
  const adminApiKey = process.env.ADMIN_API_KEY;
  const providedKey = req.headers['x-admin-key'] || (req.headers.authorization && req.headers.authorization.replace(/^Bearer\s+/i, ''));

  // In production, require authentication to protect customer data
  if (process.env.NODE_ENV === 'production') {
    if (!adminApiKey) {
      return res.status(403).json({ error: 'Order viewing is disabled in production pending admin authentication configuration.' });
    }
    if (!providedKey || providedKey !== adminApiKey) {
      return res.status(401).json({ error: 'Unauthorized: Valid admin API key required.' });
    }
  } else if (adminApiKey && providedKey !== adminApiKey) {
    return res.status(401).json({ error: 'Unauthorized: Valid admin API key required.' });
  }

  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(20).lean();
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// @route   POST /api/reservations
// @desc    Submit a table reservation (Validated, status 'pending' until availability confirmed, SES acknowledgement)
router.post('/reservations', writeLimiter, async (req, res) => {
  try {
    const { name, email, phone, date, time, guests, specialRequests } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Guest name is required.' });
    }
    const cleanName = name.trim().slice(0, 100);

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    const cleanEmail = email.trim().toLowerCase().slice(0, 255);

    if (!phone || typeof phone !== 'string' || phone.trim().length < 7 || phone.trim().length > 20) {
      return res.status(400).json({ error: 'A valid contact phone number (7-20 digits) is required.' });
    }
    const cleanPhone = phone.trim();

    if (!date || typeof date !== 'string' || !isValidFutureOrTodayDate(date)) {
      return res.status(400).json({ error: 'Reservation date must be a valid current or future date.' });
    }
    const cleanDate = date.trim();

    if (!time || typeof time !== 'string' || !time.trim()) {
      return res.status(400).json({ error: 'Reservation time is required.' });
    }
    const cleanTime = time.trim().slice(0, 30);

    // Parse guest count safely (handles '8+', '2', etc.)
    const parsedGuests = parseInt(String(guests || '').replace(/[^0-9]/g, ''), 10) || 2;
    if (parsedGuests < 1 || parsedGuests > 20) {
      return res.status(400).json({ error: 'Party size must be between 1 and 20 guests.' });
    }

    const cleanSpecialRequests = specialRequests && typeof specialRequests === 'string'
      ? specialRequests.trim().slice(0, 500)
      : '';

    // Generate unique cryptographically random reservation code with collision retry
    const saved = await saveWithCollisionRetry(() => {
      const reservationCode = `RES-2026-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      return new Reservation({
        reservationCode,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        date: cleanDate,
        time: cleanTime,
        guests: parsedGuests,
        specialRequests: cleanSpecialRequests,
        status: 'pending',
        emailNotificationStatus: 'not_attempted',
      });
    });

    console.info(`[Reservation Created] Code: ${saved.reservationCode} for ${saved.guests} guests on ${saved.date} (Email: ${maskEmail(saved.email)})`);

    // Dispatch Amazon SES acknowledgement asynchronously without blocking or reversing the reservation
    sendReservationAcknowledgement({
      reservationCode: saved.reservationCode,
      name: saved.name,
      email: saved.email,
      date: saved.date,
      time: saved.time,
      guests: saved.guests,
      specialRequests: saved.specialRequests,
    }).then(async (emailResult) => {
      try {
        if (emailResult.status) {
          saved.emailNotificationStatus = emailResult.status;
          await saved.save();
        }
      } catch (saveErr) {
        // Non-critical background save failure
      }
    }).catch((err) => {
      console.error(`[SES Background Error] ${err.message}`);
    });

    // Return saved object matching existing frontend expectation
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error saving reservation:', err.message);
    res.status(500).json({ error: 'Failed to record reservation request in database' });
  }
});

module.exports = router;
