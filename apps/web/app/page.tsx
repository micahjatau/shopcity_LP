import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ShopCity Supermarket | Shop and Earn Rewards',
  description:
    'Shop at ShopCity Supermarket in Jos, Plateau State, and enjoy loyalty rewards on eligible purchases.',
  robots: { index: true, follow: true },
};

const businessName = 'ShopCity Designers Global Supermarket Ltd';
const address =
  'No. 35, Yakubu Gowon Way, Jos, Plateau State, opposite Obasanjo Model School, Nigeria.';
const email = 'dcshopcity@gmail.com';
const phone = '08033255495';

const features = [
  {
    title: 'Shop in-store',
    description: 'Visit ShopCity for groceries, household goods and everyday essentials.',
  },
  {
    title: 'Earn loyalty rewards',
    description: 'Eligible purchases can earn rewards for registered ShopCity customers.',
  },
  {
    title: 'Redeem at checkout',
    description: 'Use available rewards when shopping with us, subject to program terms.',
  },
];

export default function HomePage() {
  return (
    <main className="public-site">
      <header className="public-header">
        <Link href="/" className="public-brand" aria-label="ShopCity home">
          <Image
            src="/brand/Frame%202147224881.svg"
            alt="ShopCity Supermarket logo"
            width={177}
            height={46}
            priority
          />
        </Link>
        <nav aria-label="Main navigation" className="public-nav">
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <Link href="/login" className="public-nav-cta">
            Staff sign in
          </Link>
        </nav>
      </header>

      <section className="public-hero" aria-labelledby="hero-title">
        <div className="public-hero-copy">
          <p className="public-kicker">Your local supermarket in Jos</p>
          <h1 id="hero-title">Shop your favourites. Get rewarded for coming back.</h1>
          <p className="public-lede">
            Welcome to ShopCity Supermarket in Jos. Shop for your everyday
            essentials and enjoy loyalty rewards on eligible in-store purchases.
          </p>
          <div className="public-actions">
            <a
              className="public-button"
              href="#contact"
            >
              Find our store
            </a>
            <a className="public-text-link" href="#rewards">
              How rewards work
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
            Shop. Earn. Redeem.
          </span>
        </div>
      </section>

      <section
        className="public-about"
        id="about"
        aria-labelledby="about-title"
      >
        <div>
          <p className="public-kicker">Our supermarket</p>
          <h2 id="about-title">Everyday shopping, with a little extra.</h2>
        </div>
        <p>
          We are a supermarket serving customers in Jos, Plateau State.
          Our in-store loyalty program is for people who shop with us,
          not a software service sold to other retailers.
        </p>
      </section>

      <section className="public-features" id="rewards" aria-label="Shopping and loyalty rewards">
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
          <h2 id="contact-title">Come shop with us in Jos.</h2>
          <a
            className="public-button public-button-light"
            href={'tel:' + phone}
          >
            Call the store
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
