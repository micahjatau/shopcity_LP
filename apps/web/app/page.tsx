import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ShopCity | Customer loyalty for businesses',
  description:
    'ShopCity helps businesses reward loyal customers, manage redemptions, and grow repeat sales.',
  robots: { index: true, follow: true },
};

const businessName = 'ShopCity Designers Global Supermarket Ltd';
const address =
  'No. 35, Yakubu Gowon Way, Jos, Plateau State, opposite Obasanjo Model School, Nigeria.';
const email = 'dcshopcity@gmail.com';
const phone = '08033255495';

const features = [
  {
    title: 'Loyalty rewards',
    description: 'Reward customers when they shop at your business.',
  },
  {
    title: 'Easy redemption',
    description:
      'Make it simple for customers to use their rewards at checkout.',
  },
  {
    title: 'Business dashboard',
    description: 'Manage customer activity and store rewards in one place.',
  },
];

export default function HomePage() {
  return (
    <main className="public-site">
      <header className="public-header">
        <Link href="/" className="public-brand" aria-label="ShopCity home">
          <Image
            src="/brand/shopcity-lockup-on-red.svg"
            alt="ShopCity"
            width={150}
            height={42}
            priority
          />
        </Link>
        <nav aria-label="Main navigation" className="public-nav">
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <Link href="/login" className="public-nav-cta">
            Sign in
          </Link>
        </nav>
      </header>

      <section className="public-hero" aria-labelledby="hero-title">
        <div className="public-hero-copy">
          <p className="public-kicker">Customer loyalty for local businesses</p>
          <h1 id="hero-title">Reward loyal customers. Grow repeat sales.</h1>
          <p className="public-lede">
            ShopCity helps businesses run digital loyalty programs so customers
            can earn and redeem rewards with ease.
          </p>
          <div className="public-actions">
            <a
              className="public-button"
              href={`mailto:${email}?subject=${encodeURIComponent('ShopCity demo request')}`}
            >
              Request a demo
            </a>
            <a className="public-text-link" href={`mailto:${email}`}>
              Contact us
            </a>
          </div>
        </div>
        <div className="public-hero-art" aria-hidden="true">
          <Image
            src="/brand/shopcity-card.svg"
            alt=""
            width={380}
            height={300}
            priority
          />
          <span className="public-art-note">
            Every purchase deserves a reward.
          </span>
        </div>
      </section>

      <section
        className="public-about"
        id="about"
        aria-labelledby="about-title"
      >
        <div>
          <p className="public-kicker">For merchants</p>
          <h2 id="about-title">Build stronger customer relationships.</h2>
        </div>
        <p>
          ShopCity makes it easier for retailers to reward loyal customers,
          manage redemptions, and encourage people to come back.
        </p>
      </section>

      <section className="public-features" aria-label="ShopCity features">
        {features.map((feature, index) => (
          <article className="public-feature" key={feature.title}>
            <span className="public-feature-number">0{index + 1}</span>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>

      <section
        className="public-contact"
        id="contact"
        aria-labelledby="contact-title"
      >
        <div>
          <p className="public-kicker">ShopCity</p>
          <h2 id="contact-title">Let’s talk about rewarding your customers.</h2>
          <a
            className="public-button public-button-light"
            href={`mailto:${email}?subject=${encodeURIComponent('ShopCity demo request')}`}
          >
            Request a demo
          </a>
        </div>
        <address>
          <strong>{businessName}</strong>
          <a href={`mailto:${email}`}>{email}</a>
          <a href={`tel:${phone.replaceAll(' ', '')}`}>{phone}</a>
          <span>{address}</span>
        </address>
      </section>

      <footer className="public-footer">
        <span>{businessName}</span>
        <a href={`mailto:${email}`}>{email}</a>
        <span>{address}</span>
        <small>
          © {new Date().getFullYear()} ShopCity. All rights reserved.
        </small>
      </footer>
    </main>
  );
}
