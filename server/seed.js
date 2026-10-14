const fs = require('fs');
const path = require('path');
const dns = require('dns');
const mongoose = require('mongoose');
require('dotenv').config();

// Ensure reliable DNS resolution for MongoDB Atlas SRV records on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // fallback to system default
}

const Dish = require('./models/Dish');
const Category = require('./models/Category');
const Order = require('./models/Order');
const Reservation = require('./models/Reservation');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('\n❌ ERROR: MONGO_URI is missing in your .env file!');
  console.error('Please add your MongoDB connection string in .env and run this command again.\n');
  process.exit(1);
}

// Clean MongoDB Extended JSON format to standard JSON objects
function cleanDoc(obj) {
  if (Array.isArray(obj)) {
    return obj.map(cleanDoc);
  }
  if (obj !== null && typeof obj === 'object') {
    const cleaned = {};
    for (const [key, val] of Object.entries(obj)) {
      if (key === '_id' && val && val.$oid) {
        // Let Mongoose generate fresh _id or use string
        continue;
      } else if (val && typeof val === 'object' && val.$date) {
        cleaned[key] = new Date(val.$date);
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        cleaned[key] = cleanDoc(val);
      } else if (Array.isArray(val)) {
        cleaned[key] = val.map(cleanDoc);
      } else {
        cleaned[key] = val;
      }
    }
    return cleaned;
  }
  return obj;
}

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB successfully!');

    const filePath = path.join(__dirname, '..', 'mongo.db');
    if (!fs.existsSync(filePath)) {
      console.error(`Cannot find mongo.db at ${filePath}`);
      process.exit(1);
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const dbData = JSON.parse(rawData);

    // Seed Categories
    if (dbData.categories && dbData.categories.length > 0) {
      await Category.deleteMany({});
      const cleanCategories = cleanDoc(dbData.categories);
      await Category.insertMany(cleanCategories);
      console.log(`📦 Seeded ${cleanCategories.length} categories.`);
    }

    // Seed Dishes
    if (dbData.dishes && dbData.dishes.length > 0) {
      await Dish.deleteMany({});
      const cleanDishes = cleanDoc(dbData.dishes);
      await Dish.insertMany(cleanDishes);
      console.log(`🍽️  Seeded ${cleanDishes.length} dishes.`);
    }

    // Seed Existing Orders (sample)
    if (dbData.orders && dbData.orders.length > 0) {
      await Order.deleteMany({});
      const cleanOrders = cleanDoc(dbData.orders);
      await Order.insertMany(cleanOrders);
      console.log(`📋 Seeded ${cleanOrders.length} sample orders.`);
    }

    // Seed Existing Reservations (sample)
    if (dbData.reservations && dbData.reservations.length > 0) {
      await Reservation.deleteMany({});
      const cleanReservations = cleanDoc(dbData.reservations);
      await Reservation.insertMany(cleanReservations);
      console.log(`📅 Seeded ${cleanReservations.length} sample reservations.`);
    }

    console.log('\n🎉 Database seeding finished successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
}

seed();
