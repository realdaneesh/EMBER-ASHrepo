import React from 'react';

const AboutSection = () => (
  <section id="about" className="about-section" aria-label="About Ember and Ash">
    <div className="about-images">
      <img
        src="https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop"
        alt="Flame-grilled chicken - our specialty"
        className="about-img-main"
      />
      <img
        src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format&fit=crop"
        alt="Slow-cooked goat curry in clay pot"
        className="about-img-secondary"
      />
      <div className="about-img-badge" aria-label="15 years of experience">
        <div className="about-img-badge-num">15</div>
        <div className="about-img-badge-label">Years of<br />Craft</div>
      </div>
    </div>

    <div className="about-text">
      <div className="section__label">Our Story</div>
      <h2 className="section__title">Passion Forged in<br />Fire Since 2009</h2>
      <p className="section__subtitle" style={{ marginBottom: '1.25rem' }}>
        Ember &amp; Ash was born from a simple belief: great food starts with fresh ingredients and masterfully handled fire.
        Our chefs slow-simmer our signature goat curry for 6 hours, grill tender chicken over charcoal flames, and prepare fresh farm-to-table vegetarian delights daily.
      </p>
      <p className="section__subtitle">
        We're not just a restaurant — we're a gathering place where the warmth of the
        grill meets the warmth of community. Come hungry, leave obsessed.
      </p>

      <div className="about-text__perks">
        {[
          { icon: '🔥', title: 'Live Fire Cooking', desc: 'Every dish kissed by real hardwood flames.' },
          { icon: '🐐', title: 'Tender Goat & Chicken', desc: 'Slow-cooked and marinated in our custom spice blends.' },
          { icon: '🌱', title: 'Fresh Veggie Delights', desc: 'From crispy starters to rich main courses.' },
          { icon: '🏆', title: 'Award-Winning', desc: 'Best Casual Grill & Kitchen — City Eats Awards.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="perk-card">
            <div className="perk-card__icon">{icon}</div>
            <div className="perk-card__title">{title}</div>
            <div className="perk-card__desc">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default AboutSection;
