import React, { useState, useEffect } from 'react';

const Navbar = ({ orderCount = 0, activeOrder = null, onOpenOrder }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav id="navbar" className={`navbar${scrolled ? ' scrolled' : ''}`} role="navigation" aria-label="Main navigation">
      <div className="navbar__inner">
        <a href="#home" className="navbar__logo" onClick={(e) => { e.preventDefault(); scrollTo('home'); }}>
          <div className="navbar__logo-icon">🔥</div>
          <div className="navbar__logo-name">
            Ember<span>&</span>Ash
          </div>
        </a>

        <ul className="navbar__links">
          {[['#menu', 'Menu'], ['#about', 'About'], ['#testimonials', 'Reviews'], ['#reservation', 'Reservations']].map(([href, label]) => (
            <li key={label}>
              <a
                href={href}
                onClick={(e) => { e.preventDefault(); scrollTo(href.slice(1)); }}
              >
                {label}
              </a>
            </li>
          ))}
          <li>
            <button
              id="nav-order-btn"
              className={`navbar__order-nav-btn ${orderCount > 0 || activeOrder ? 'has-order' : ''}`}
              onClick={onOpenOrder}
              aria-label="View table order"
            >
              {activeOrder ? (
                <>
                  <span className="nav-pulsing-flame">🔥</span>
                  <span>Table #{activeOrder.tableNumber}: Making</span>
                </>
              ) : (
                <>
                  <span>🛒</span>
                  <span>Table Order</span>
                  {orderCount > 0 && <span className="nav-order-badge">{orderCount}</span>}
                </>
              )}
            </button>
          </li>
          <li>
            <a
              href="#reservation"
              id="nav-reserve-btn"
              className="navbar__cta"
              onClick={(e) => { e.preventDefault(); scrollTo('reservation'); }}
            >
              Book a Table
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
