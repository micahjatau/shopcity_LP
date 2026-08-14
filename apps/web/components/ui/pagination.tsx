import Link from 'next/link';
import type { AnchorHTMLAttributes } from 'react';

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
};

export function Pagination({ currentPage, totalPages, hrefForPage }: Readonly<PaginationProps>) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  return (
    <nav aria-label="Pagination" className="sc-pagination">
      <ul>
        {pages.map((page) => (
          <li key={page}>
            {page === currentPage ? (
              <span aria-current="page">{page}</span>
            ) : (
              <Link href={hrefForPage(page)}>{page}</Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
