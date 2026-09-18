import Link from 'next/link';
import Image from 'next/image';
import { LoginForm } from '../../../components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="login-page" data-od-id="login-page">
      <Link className="login-page__back" href="/" data-od-id="brand-link">
        Back to overview
      </Link>
      <header className="login-page__header" data-od-id="login-header">
        <Image
          src="/brand/shopcity-lockup-white.svg"
          alt="ShopCity Supermarket"
          width={172}
          height={52}
          priority
        />
        <span className="login-page__rule" aria-hidden="true" />
      </header>

      <section
        className="login-page__card"
        aria-labelledby="login-title"
        data-od-id="staff-sign-in"
      >
        {' '}
        <h1 id="login-title" className="sr-only">
          Sign in to the ShopCity retail operations shell.
        </h1>
        <div className="login-page__intro">
          <p className="login-page__eyebrow">ShopCity operations</p>
          <h2 data-od-id="login-heading">Staff sign in</h2>
          <p>Sign in to open your role-scoped workspace.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
