'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Something went wrong</h1>
      <p>ShopCity could not render this route.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
