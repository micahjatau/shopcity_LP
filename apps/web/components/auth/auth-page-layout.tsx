import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthPageLayout({
  title,
  description,
  children,
  pageId,
}: {
  title: string;
  description: string;
  children: ReactNode;
  pageId: string;
}) {
  return (
    <main className="login-page" data-od-id={pageId}>
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
        <header className="login-page__header">
          <Link
            className="login-page__brand"
            href="/"
            aria-label="ShopCity Supermarket home"
          >
            <Image
              className="login-page__brand-logo"
              src="/brand/Frame%202147224881.svg"
              alt="ShopCity Supermarket"
              width={132}
              height={35}
              priority
            />
          </Link>
          <span className="login-page__rule" aria-hidden="true" />
        </header>

        <div className="login-page__main">
          <section
            className="login-page__card"
            aria-labelledby="auth-page-title"
          >
            <h1 id="auth-page-title">{title}</h1>
            <p className="login-page__intro">{description}</p>
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
