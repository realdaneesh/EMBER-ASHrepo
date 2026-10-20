const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  dishId: { type: Number },
  name: { type: String, required: true },
  price: { type: String },
  priceNum: { type: Number, required: true },
  image: { type: String },
  quantity: { type: Number, required: true, min: 1 },
});

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true, required: true },
    tableNumber: { type: String, required: true },
    guestName: { type: String, default: 'Guest' },
    guestEmail: { type: String, default: '' },
    notes: { type: String, default: '' },
    items: [orderItemSchema],
    subtotal: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['in_making', 'served', 'completed', 'cancelled'],
      default: 'in_making',
    },
    emailNotificationStatus: {
      type: String,
      enum: ['disabled', 'sent', 'failed', 'skipped_sandbox', 'not_attempted'],
      default: 'not_attempted',
    },
    timePlaced: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
