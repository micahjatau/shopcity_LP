import Image from 'next/image';
import Link from 'next/link';
import { LoginForm } from '../../../components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="login-page" data-od-id="login-page">
      <div className="login-page__deep-edge" aria-hidden="true" />
      <div
        className="login-page__band login-page__band--one"
        aria-hidden="true"
      />
      <div
        className="login-page__band login-page__band--two"
        aria-hidden="true"
      />
      <div className="login-page__shell">
        <header className="login-page__header" data-od-id="login-header">
          <Link
            className="login-page__brand"
            href="/"
            aria-label="ShopCity Supermarket home"
            data-od-id="brand-link"
          >
            <Image
              className="login-page__brand-mark"
              src="/brand/shopcity-mark-white.svg"
              alt=""
              width={30}
              height={30}
            />
            <span className="login-page__brand-copy">
              <strong>SHOPCITY</strong>
              <small>SUPERMARKET</small>
            </span>
          </Link>
          <span className="login-page__rule" aria-hidden="true" />
        </header>

        <div className="login-page__main">
          <section
            className="login-page__card"
            aria-labelledby="login-title"
            data-od-id="staff-sign-in"
          >
            <h1 id="login-title" data-od-id="login-heading">
              Staff sign in
            </h1>
            <p className="login-page__intro">
              Choose a staff account to open the workspace for that role.
            </p>
            <LoginForm />
          </section>
        </div>
      </div>
    </main>
  );
}
