import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'ShopCity',
  description: 'ShopCity frontend design-system implementation scaffold.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
