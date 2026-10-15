const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    reservationCode: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    guests: { type: Number, default: 2 },
    tableAssigned: { type: Number, default: null },
    specialRequests: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    emailNotificationStatus: {
      type: String,
      enum: ['disabled', 'sent', 'failed', 'not_attempted'],
      default: 'not_attempted',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reservation', reservationSchema);
