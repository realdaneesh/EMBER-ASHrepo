import React, { useState } from 'react';

const HOURS = [
  { day: 'Monday', time: 'Closed', closed: true },
  { day: 'Tuesday – Thursday', time: '5:00 PM – 10:00 PM', closed: false },
  { day: 'Friday – Saturday', time: '4:00 PM – 11:30 PM', closed: false },
  { day: 'Sunday', time: '12:00 PM – 9:00 PM', closed: false },
];

const ReservationSection = ({ onReserve }) => {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', date: '', time: '', guests: '2',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onReserve(form);
    setForm({ name: '', email: '', phone: '', date: '', time: '', guests: '2' });
  };

  return (
    <section id="reservation" className="reservation-section" aria-label="Make a reservation">
      {/* Left info column */}
      <div className="reservation-info">
        <div className="section__label">Reservations</div>
        <h2 className="section__title">Reserve Your<br />Table Tonight</h2>
        <p className="section__subtitle">
          Secure your spot for an unforgettable evening. Walk-ins are always welcome,
          but we recommend booking ahead — we fill up fast on weekends.
        </p>

        <div className="reservation-info__contact" style={{ marginTop: '1.75rem' }}>
          {[
            { icon: '📞', label: '+91 (022) 6789 4500' },
            { icon: '📧', label: 'mumbai@emberandash.com' },
            { icon: '📍', label: 'The Mills, Senapati Bapat Marg, Lower Parel, Mumbai, Maharashtra 400013' },
          ].map(({ icon, label }) => (
            <div key={label} className="footer__contact-item">
              <span className="footer__contact-icon">{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="reservation-info__hours">
          <h3 style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-amber)', marginBottom: '0.75rem' }}>
            Hours of Operation
          </h3>
          {HOURS.map(({ day, time, closed }) => (
            <div key={day} className="hours-item">
              <span className="hours-item__day">{day}</span>
              <span className={`hours-item__time${closed ? ' closed' : ''}`}>{time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form column */}
      <div className="reservation-form" role="form" aria-label="Reservation form">
        <h3 className="reservation-form__title">Book a Table</h3>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="res-name" className="form-label">Full Name</label>
              <input
                id="res-name"
                name="name"
                type="text"
                className="form-input"
                placeholder="John Smith"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="res-guests" className="form-label">Guests</label>
              <select
                id="res-guests"
                name="guests"
                className="form-select"
                value={form.guests}
                onChange={handleChange}
              >
                {['1','2','3','4','5','6','7','8+'].map((n) => (
                  <option key={n} value={n}>{n} {n === '1' ? 'Person' : 'People'}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="res-email" className="form-label">Email Address</label>
            <input
              id="res-email"
              name="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="res-phone" className="form-label">Phone Number</label>
            <input
              id="res-phone"
              name="phone"
              type="tel"
              className="form-input"
              placeholder="+1 (555) 000-0000"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="res-date" className="form-label">Date</label>
              <input
                id="res-date"
                name="date"
                type="date"
                className="form-input"
                value={form.date}
                onChange={handleChange}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="form-group">
              <label htmlFor="res-time" className="form-label">Time</label>
              <select
                id="res-time"
                name="time"
                className="form-select"
                value={form.time}
                onChange={handleChange}
                required
              >
                <option value="">Select time</option>
                {['5:00 PM','5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM','9:30 PM'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <button id="reservation-submit-btn" type="submit" className="form-submit">
            🍽️ Confirm Reservation
          </button>
        </form>
      </div>
    </section>
  );
};

export default ReservationSection;
