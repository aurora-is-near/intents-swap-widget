import type { ReactNode } from 'react';

import type { useTabs } from './a11y';
import { cx } from './ui';

type Tabs<T extends string> = ReturnType<typeof useTabs<T>>;

/**
 * A few choices over one sliding background: tabs (arrow keys, one Tab
 * stop) from the parent's `useTabs`, whose panel the parent renders.
 */
export const Segmented = <T extends string>({
  items,
  value,
  name,
  tabs,
  size = 'md',
}: {
  items: readonly { id: T; label: string; icon: ReactNode }[];
  value: T;
  /** What the tabs choose between, for screen readers. */
  name: string;
  tabs: Tabs<T>;
  /** `sm`: 28 px tall, 12 px text, for a switch under content. */
  size?: 'md' | 'sm';
}) => {
  const index = Math.max(
    0,
    items.findIndex((item) => item.id === value),
  );

  // The background's inset on each side: the list's own padding.
  const inset = size === 'sm' ? 'calc(var(--spacing) * 0.5)' : 'var(--spacing)';

  return (
    <div
      {...tabs.listProps(name)}
      className={cx(
        'relative grid bg-track',
        size === 'sm' ? 'rounded-chip p-0.5' : 'rounded-control p-1',
      )}
      style={{
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
      }}>
      <span
        aria-hidden
        className={cx(
          'absolute left-0 bg-control shadow-box transition-transform duration-200 ease-out',
          size === 'sm'
            ? 'inset-y-0.5 ml-0.5 rounded-[calc(var(--r-chip)-1px)]'
            : 'inset-y-1 ml-1 rounded-chip',
        )}
        style={{
          width: `calc((100% - 2 * ${inset}) / ${items.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {items.map(({ id, label, icon }) => (
        <button
          key={id}
          {...tabs.tabProps(id)}
          className={cx(
            'relative flex items-center justify-center font-medium transition-colors',
            size === 'sm'
              ? 'h-6 gap-1 rounded-[calc(var(--r-chip)-1px)] text-xs'
              : 'h-8 gap-1.5 rounded-chip',
            value === id
              ? 'text-text-primary'
              : 'text-text-muted hover:text-text-secondary',
          )}>
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
};
