const mongoose = require('mongoose');

const dishSchema = new mongoose.Schema(
  {
    dishId: { type: Number, unique: true, sparse: true },
    name: { type: String, required: true },
    price: { type: String, required: true },
    priceNum: { type: Number, required: true },
    desc: { type: String, required: true },
    image: { type: String, required: true },
    badge: { type: String, default: null },
    ingredients: [{ type: String }],
    rating: { type: Number, default: 4.8 },
    reviews: { type: Number, default: 0 },
    category: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
    isVegetarian: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Dish', dishSchema);
