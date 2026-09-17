import Image from 'next/image';
import { LoginForm } from '../../../components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="login-page">
      <header className="login-page__header">
        <Image
          src="/brand/shopcity-lockup-white.svg"
          alt="ShopCity Supermarket"
          width={172}
          height={52}
          priority
        />
        <span className="login-page__rule" aria-hidden="true" />
      </header>

      <section className="login-page__card" aria-labelledby="login-title">
        <h1 id="login-title" className="sr-only">
          Sign in to the ShopCity retail operations shell.
        </h1>
        <div className="login-page__intro">
          <p className="login-page__eyebrow">ShopCity operations</p>
          <h2>Staff sign in</h2>
          <p>Sign in to open your role-scoped workspace.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
