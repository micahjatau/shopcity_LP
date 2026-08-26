import type { ReactNode } from 'react';

export type TabsItem = {
  value: string;
  label: ReactNode;
  panel: ReactNode;
};

export function Tabs({
  items,
  defaultValue,
}: Readonly<{ items: TabsItem[]; defaultValue?: string }>) {
  const active = items.find((item) => item.value === defaultValue) ?? items[0];
  return (
    <div className="sc-tabs">
      <div role="tablist" aria-label="Tabs">
        {items.map((item) => (
          <button
            key={item.value}
            role="tab"
            aria-selected={item.value === active.value}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{active?.panel}</div>
    </div>
  );
}
