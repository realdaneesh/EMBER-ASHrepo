import React, { useState } from 'react';

export const DISHES = [
  // ── STARTERS ──────────────────────────────────────────────────────────
  {
    id: 1,
    name: 'Seasoned Crispy Fries',
    price: '₹290',
    priceNum: 290,
    desc: 'Golden crispy fries tossed in our signature seasoning blend — paprika, garlic, herbs — served with smoky chipotle dip.',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop',
    badge: 'Fan Favourite',
    ingredients: ['Russet Potatoes', 'Paprika', 'Garlic Powder', 'Sea Salt', 'Chipotle Dip'],
    rating: '4.8',
    reviews: 541,
    category: 'Starters',
  },
  {
    id: 2,
    name: 'Loaded Onion Rings',
    price: '₹340',
    priceNum: 340,
    desc: 'Beer-battered thick-cut onion rings fried to a perfect crunch, served with honey mustard and ranch dipping sauces.',
    image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600&auto=format&fit=crop',
    badge: 'Crispy',
    ingredients: ['Sweet Onions', 'Beer Batter', 'Breadcrumbs', 'Honey Mustard', 'Ranch Sauce'],
    rating: '4.7',
    reviews: 312,
    category: 'Starters',
  },
  {
    id: 3,
    name: 'Corn & Jalapeño Fritters',
    price: '₹380',
    priceNum: 380,
    desc: 'Crispy golden fritters packed with sweet corn, jalapeño and cheddar, served with sour cream and sweet chilli sauce.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop',
    badge: 'Vegetarian',
    ingredients: ['Sweet Corn', 'Jalapeño', 'Cheddar', 'Sour Cream', 'Sweet Chilli'],
    rating: '4.6',
    reviews: 198,
    category: 'Starters',
  },
  {
    id: 4,
    name: 'Chicken Soup',
    price: '₹320',
    priceNum: 320,
    desc: 'Rich slow-simmered chicken broth with shredded tender chicken, fresh vegetables, and warm crusty garlic bread on the side.',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop',
    badge: 'Comfort Pick',
    ingredients: ['Whole Chicken', 'Carrots', 'Celery', 'Onion', 'Fresh Herbs', 'Garlic Bread'],
    rating: '4.7',
    reviews: 276,
    category: 'Starters',
  },

  // ── CHICKEN ───────────────────────────────────────────────────────────
  {
    id: 5,
    name: 'Flame-Grilled Half Chicken',
    price: '₹690',
    priceNum: 690,
    desc: 'Marinated half chicken grilled over hardwood coals — smoky, juicy, and charred to perfection. Served with roasted spiced potatoes.',
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop',
    badge: 'Chef\'s Pick',
    ingredients: ['Free-Range Chicken', 'Lemon Marinade', 'Garlic', 'Rosemary', 'Roasted Potatoes'],
    rating: '4.9',
    reviews: 389,
    category: 'Chicken',
  },
  {
    id: 6,
    name: 'Southern Crispy Fried Chicken',
    price: '₹620',
    priceNum: 620,
    desc: 'Juicy chicken coated in a crunchy seasoned crust, double-fried for maximum crispiness. Served with hot honey drizzle and coleslaw.',
    image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop',
    badge: 'Most Ordered',
    ingredients: ['Bone-In Chicken', 'Buttermilk Brine', 'Spiced Crust', 'Hot Honey', 'Coleslaw'],
    rating: '4.9',
    reviews: 621,
    category: 'Chicken',
  },
  {
    id: 7,
    name: 'Chicken Tikka Skewers',
    price: '₹580',
    priceNum: 580,
    desc: 'Tender chicken pieces marinated in Kashmiri chillies and spiced yoghurt, skewered and fired in our tandoor. Served with mint chutney.',
    image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&auto=format&fit=crop',
    badge: 'Spicy 🌶️',
    ingredients: ['Chicken Breast', 'Yoghurt Marinade', 'Tandoori Spices', 'Mint Chutney', 'Butter Naan'],
    rating: '4.8',
    reviews: 445,
    category: 'Chicken',
  },
  {
    id: 8,
    name: 'BBQ Chicken Burger',
    price: '₹520',
    priceNum: 520,
    desc: 'Smoky BBQ chicken thigh fillet with melted Swiss cheese, lettuce, tomato, house pickles and garlic aioli on a toasted brioche bun.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop',
    badge: 'New',
    ingredients: ['Chicken Thigh', 'Swiss Cheese', 'Smoky BBQ', 'Brioche Bun', 'Garlic Aioli'],
    rating: '4.7',
    reviews: 203,
    category: 'Chicken',
  },

  // ── GOAT ──────────────────────────────────────────────────────────────
  {
    id: 9,
    name: 'Slow-Cooked Goat Curry',
    price: '₹890',
    priceNum: 890,
    desc: 'Melt-in-your-mouth goat slow-braised in hand-ground aromatic spices for 6 hours. Served in a clay handi with butter naan.',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format&fit=crop',
    badge: 'Chef\'s Pick',
    ingredients: ['Young Goat', 'Hand-Ground Spices', 'Tomato Onion Gravy', 'Butter Naan', 'Basmati Rice'],
    rating: '5.0',
    reviews: 287,
    category: 'Goat',
  },
  {
    id: 10,
    name: 'Grilled Goat Chops',
    price: '₹980',
    priceNum: 980,
    desc: 'Thick-cut goat chops rubbed with roasted cumin and crushed peppercorns, flame-seared and served with spiced mint glaze.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop',
    badge: 'Signature',
    ingredients: ['Goat Chops', 'Roasted Cumin Rub', 'Crushed Peppercorns', 'Charcoal Flame', 'Mint Glaze'],
    rating: '4.9',
    reviews: 164,
    category: 'Goat',
  },

  // ── VEGETARIAN ────────────────────────────────────────────────────────
  {
    id: 11,
    name: 'Paneer Tikka Platter',
    price: '₹480',
    priceNum: 480,
    desc: 'Creamy cubes of fresh malai paneer marinated in spiced hung curd, charred over live charcoal. Served with roasted peppers & chutney.',
    image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&auto=format&fit=crop',
    badge: 'Vegetarian',
    ingredients: ['Fresh Malai Paneer', 'Spiced Hung Curd', 'Bell Peppers', 'Onions', 'Mint Chutney'],
    rating: '4.8',
    reviews: 312,
    category: 'Vegetarian',
  },
  {
    id: 12,
    name: 'Garden Veggie Burger',
    price: '₹450',
    priceNum: 450,
    desc: 'Smoky grilled black bean and mushroom patty with avocado, crisp lettuce, heirloom tomato and spicy mayo on a toasted sesame bun.',
    image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=600&auto=format&fit=crop',
    badge: 'Plant-Based',
    ingredients: ['Black Bean Patty', 'Portobello Mushroom', 'Avocado', 'Spicy Mayo', 'Sesame Bun'],
    rating: '4.6',
    reviews: 189,
    category: 'Vegetarian',
  },
  {
    id: 13,
    name: 'Creamy Dal Makhani',
    price: '₹420',
    priceNum: 420,
    desc: 'Slow-simmered black lentils simmered overnight in a velvety tomato and butter reduction with fresh cream. Served with garlic butter naan.',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop',
    badge: 'Vegetarian',
    ingredients: ['Black Lentils', 'Slow Cooked', 'Cultured Butter', 'Fresh Cream', 'Garlic Butter Naan'],
    rating: '4.7',
    reviews: 243,
    category: 'Vegetarian',
  },
];

const CATEGORIES = ['All', 'Starters', 'Chicken', 'Goat', 'Vegetarian'];

const DishCard = ({ dish, onOrder, itemCount = 0 }) => (
  <article className="dish-card" id={`dish-card-${dish.id}`} aria-label={dish.name}>
    <div className="dish-card__image-wrap">
      <img src={dish.image} alt={dish.name} className="dish-card__image" loading="lazy" />
      {dish.badge && <span className="dish-card__badge">{dish.badge}</span>}
      {itemCount > 0 && (
        <span className="dish-card__qty-pill">
          ✓ {itemCount} in Table Order
        </span>
      )}
    </div>
    <div className="dish-card__body">
      <div className="dish-card__top">
        <h3 className="dish-card__name">{dish.name}</h3>
        <span className="dish-card__price">{dish.price}</span>
      </div>
      <p className="dish-card__desc">{dish.desc}</p>
      <div className="dish-card__ingredients">
        {dish.ingredients.map((ing) => (
          <span key={ing} className="ingredient-tag">{ing}</span>
        ))}
      </div>
      <div className="dish-card__footer">
        <div className="dish-card__rating">
          <span className="dish-card__stars">{'★'.repeat(Math.round(parseFloat(dish.rating)))}</span>
          <span>{dish.rating} ({dish.reviews})</span>
        </div>
        <button
          id={`order-btn-${dish.id}`}
          className={`dish-card__order-btn ${itemCount > 0 ? 'added' : ''}`}
          onClick={() => onOrder(dish)}
          aria-label={`Add ${dish.name} to table order`}
        >
          {itemCount > 0 ? `+ Add More (${itemCount})` : '+ Add to Order'}
        </button>
      </div>
    </div>
  </article>
);

const MenuSection = ({ onOrder, orderItems = [] }) => {
  const [activeCategory, setActiveCategory] = useState('All');

  const getItemCount = (dishId) => {
    const found = orderItems.find((it) => it.id === dishId);
    return found ? found.quantity : 0;
  };

  const filtered = activeCategory === 'All'
    ? DISHES
    : DISHES.filter((d) => d.category === activeCategory);

  return (
    <section id="menu" className="menu-section" aria-label="Our menu">
      <div className="menu-section__inner">
        <div className="menu-header">
          <div>
            <div className="section__label">Lower Parel Dining Menu</div>
            <h2 className="section__title">Fresh Ingredients,<br />Live Fire Flavors</h2>
          </div>
          <nav className="menu-tabs" aria-label="Menu categories">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                id={`menu-tab-${cat.toLowerCase()}`}
                className={`menu-tab${activeCategory === cat ? ' active' : ''}`}
                onClick={() => setActiveCategory(cat)}
                aria-pressed={activeCategory === cat}
              >
                {cat}
              </button>
            ))}
          </nav>
        </div>

        <div className="dishes-grid">
          {filtered.map((dish) => (
            <DishCard
              key={dish.id}
              dish={dish}
              onOrder={onOrder}
              itemCount={getItemCount(dish.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MenuSection;
