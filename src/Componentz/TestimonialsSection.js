import React from 'react';

const TESTIMONIALS = [
  {
    id: 1,
    text: "The slow-cooked goat curry was an absolute showstopper. Incredibly rich gravy and tender meat that melts in your mouth. Best goat curry I've had in years — worth every penny.",
    name: 'James Whitfield',
    meta: 'Food Critic, The Daily Tribune',
    initials: 'JW',
    stars: 5,
  },
  {
    id: 2,
    text: "Ember & Ash just gets it right. The crispy seasoned fries and flame-grilled chicken are outstanding. We come here every Friday and it never disappoints.",
    name: 'Priya Sharma',
    meta: 'Regular Guest',
    initials: 'PS',
    stars: 5,
  },
  {
    id: 3,
    text: "The ambiance is incredible — dim lights, warm wood, the smell of the grill. Plus the buffalo wings are legitimately the best in the city. Obsessed with this place.",
    name: 'Marcus Collins',
    meta: '@marcuseats · 42k followers',
    initials: 'MC',
    stars: 5,
  },
  {
    id: 4,
    text: "We booked the private dining room for our anniversary and the team went above and beyond. Flowers, a custom menu, and the most attentive service I've experienced.",
    name: 'Sonia & Rafael Torres',
    meta: 'Anniversary Dinner',
    initials: 'SR',
    stars: 5,
  },
  {
    id: 5,
    text: "The smash burger changed my life. I know that sounds dramatic, but the double stack with caramelized onions and house aioli? Perfection. 10/10 every single time.",
    name: 'Derek Nguyen',
    meta: 'Verified Guest',
    initials: 'DN',
    stars: 5,
  },
  {
    id: 6,
    text: "Came for a business dinner and was honestly blown away. The craft beer selection paired with the food was outstanding. My clients left extremely impressed.",
    name: 'Amanda Foster',
    meta: 'Corporate Events Host',
    initials: 'AF',
    stars: 5,
  },
];

const TestimonialsSection = () => (
  <section id="testimonials" className="testimonials-section" aria-label="Guest reviews">
    <div className="testimonials-section__inner">
      <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        <div className="section__label" style={{ justifyContent: 'center' }}>Guest Reviews</div>
        <h2 className="section__title" style={{ textAlign: 'center' }}>
          What Our Guests Are Saying
        </h2>
        <p className="section__subtitle" style={{ margin: '0.75rem auto 0', textAlign: 'center' }}>
          Over 2,400 five-star reviews and counting. Here are a few of our favorites.
        </p>
      </div>

      <div className="testimonials-grid">
        {TESTIMONIALS.map((t) => (
          <article key={t.id} id={`testimonial-${t.id}`} className="testimonial-card" aria-label={`Review by ${t.name}`}>
            <div className="testimonial-quote" aria-hidden="true">"</div>
            <div className="testimonial-stars" aria-label={`${t.stars} stars`}>
              {'★'.repeat(t.stars)}
            </div>
            <p className="testimonial-text">{t.text}</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar" aria-hidden="true">{t.initials}</div>
              <div>
                <div className="testimonial-name">{t.name}</div>
                <div className="testimonial-meta">{t.meta}</div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
