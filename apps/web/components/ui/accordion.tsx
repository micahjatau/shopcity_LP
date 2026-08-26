import type { ReactNode } from 'react';

export type AccordionItem = {
  value: string;
  label: ReactNode;
  content: ReactNode;
};

export function Accordion({ items }: Readonly<{ items: AccordionItem[] }>) {
  return (
    <div className="sc-accordion">
      {items.map((item) => (
        <details key={item.value}>
          <summary>{item.label}</summary>
          <div>{item.content}</div>
        </details>
      ))}
    </div>
  );
}
