const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    categoryId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    displayOrder: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
