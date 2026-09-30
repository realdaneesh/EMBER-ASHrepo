import React from 'react';

const Footer = () => (
  <footer className="footer" role="contentinfo" aria-label="Site footer">
    <div className="footer__inner">
      <div className="footer__grid">

        {/* Brand column */}
        <div className="footer__brand">
          <div className="footer__brand-name">
            Ember<span>&amp;</span>Ash
          </div>
          <p className="footer__brand-desc">
            A premium grill &amp; kitchen where fire meets craft. Flame-grilled chicken, slow-cooked goat,
            and signature starters cooked to perfection — every single night since 2009.
          </p>
          <div className="footer__socials">
            {[
              { label: 'Instagram', icon: '📸' },
              { label: 'Facebook',  icon: '👤' },
              { label: 'TikTok',    icon: '🎵' },
              { label: 'Yelp',      icon: '⭐' },
            ].map(({ label, icon }) => (
              <a
                key={label}
                href="#home"
                id={`social-${label.toLowerCase()}`}
                className="footer__social-btn"
                aria-label={label}
                onClick={(e) => e.preventDefault()}
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div>
          <div className="footer__col-title">Quick Links</div>
          <ul className="footer__links">
            {[['#menu','Menu'],['#about','Our Story'],['#testimonials','Reviews'],['#reservation','Reservations'],['#home','Gift Cards']].map(([href, label]) => (
              <li key={label}>
                <a href={href} onClick={(e) => { e.preventDefault(); document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' }); }}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Explore */}
        <div>
          <div className="footer__col-title">Explore</div>
          <ul className="footer__links">
            {['Private Dining','Catering','Craft Beer Bar','Weekend Brunch','Chef\'s Table','Loyalty Program'].map((item) => (
              <li key={item}>
                <a href="#home" onClick={(e) => e.preventDefault()}>{item}</a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <div className="footer__col-title">Contact</div>
          {[
            { icon: '📍', text: 'The Mills, Senapati Bapat Marg, Lower Parel, Mumbai, Maharashtra 400013' },
            { icon: '📞', text: '+91 (022) 6789 4500' },
            { icon: '📧', text: 'mumbai@emberandash.com' },
            { icon: '🕐', text: 'Tue–Sun · 12:00 PM – 11:30 PM' },
          ].map(({ icon, text }) => (
            <div key={text} className="footer__contact-item">
              <span className="footer__contact-icon">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="footer__bottom">
        <p className="footer__copy">
          © {new Date().getFullYear()} Ember &amp; Ash Grill &amp; Kitchen. All rights reserved.
        </p>
        <ul className="footer__bottom-links">
          {['Privacy Policy', 'Terms of Use', 'Accessibility'].map((item) => (
            <li key={item}>
              <a href="#home" onClick={(e) => e.preventDefault()}>{item}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </footer>
);

export default Footer;
