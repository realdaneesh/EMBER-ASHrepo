import React from 'react';

const Hero = ({ onScrollToMenu }) => {
  return (
    <section id="home" className="hero" aria-label="Hero section">
      <div
        className="hero__bg"
        role="img"
        aria-label="Restaurant interior background"
        style={{ backgroundImage: "url('/images/hero.jpg')" }}
      />
      <div className="hero__overlay" />

      <div className="hero__content">
        <div className="hero__eyebrow">
          <span className="hero__eyebrow-dot" />
          Now Open · Lower Parel, Mumbai, Maharashtra
        </div>

        <h1 className="hero__title">
          Where Every Bite
          <span className="hero__title-accent">Tells a Story</span>
        </h1>

        <p className="hero__subtitle">
          Ember &amp; Ash is a premium grill &amp; kitchen crafting unforgettable dining experiences —
          bold fire-kissed chicken, tender slow-cooked goat, and vibrant vegetarian delights.
        </p>

        <div className="hero__actions">
          <button
            id="hero-view-menu-btn"
            className="btn btn-primary"
            onClick={onScrollToMenu}
            aria-label="View our menu"
          >
            🍽️ View Menu
          </button>
          <button
            id="hero-reserve-btn"
            className="btn btn-secondary"
            onClick={() => document.getElementById('reservation')?.scrollIntoView({ behavior: 'smooth' })}
            aria-label="Reserve a table"
          >
            📅 Reserve a Table
          </button>
        </div>

        <div className="hero__stats">
          {[
            { value: '15+', label: 'Years of Craft' },
            { value: '50+', label: 'Signature Dishes' },
            { value: '4.9★', label: 'Guest Rating' },
          ].map(({ value, label }) => (
            <div key={label} className="hero__stat">
              <div className="hero__stat-value">{value}</div>
              <div className="hero__stat-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="hero__scroll-indicator" aria-hidden="true">
        <span>Scroll</span>
        <div className="hero__scroll-line" />
      </div>
    </section>
  );
};

export default Hero;
