import type { ReactNode } from 'react';

import { ChainIcon } from './assets/ChainIcon';
import { chainLabel } from './assets/tokens';
import { cx } from './ui';

const Chip = ({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    aria-pressed={pressed}
    onClick={onClick}
    className={cx(
      'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-chip px-2.5 text-xs font-medium whitespace-nowrap transition-colors',
      pressed
        ? 'bg-control text-text-primary shadow-box'
        : 'bg-track text-text-secondary hover:text-text-primary',
    )}>
    {children}
  </button>
);

/** What a toggle leaves selected: everything selected reads as "All" (empty). */
const toggle = (
  selected: ReadonlySet<string>,
  chain: string,
  chains: readonly string[],
): Set<string> => {
  const next = new Set(selected);

  if (next.has(chain)) {
    next.delete(chain);
  } else {
    next.add(chain);
  }

  return next.size === chains.length ? new Set() : next;
};

/**
 * Networks to filter a list by, as chips: several at once, or All (an
 * empty selection). Each chip is a toggle button with the network's name.
 * One row, scrolling sideways when they don't fit: it costs one line.
 */
export const ChainChips = ({
  label,
  chains,
  selected,
  onChange,
}: {
  /** Names the group for screen readers, e.g. "Networks". */
  label: string;
  chains: readonly string[];
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
}) => (
  <div
    role="group"
    aria-label={label}
    className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:thin]">
    <Chip pressed={selected.size === 0} onClick={() => onChange(new Set())}>
      All
    </Chip>
    {chains.map((chain) => (
      <Chip
        key={chain}
        pressed={selected.has(chain)}
        onClick={() => onChange(toggle(selected, chain, chains))}>
        <ChainIcon chain={chain} size={14} />
        {chainLabel(chain)}
      </Chip>
    ))}
  </div>
);

/** Whether a chain passes the chips: an empty selection passes everything. */
export const inChips = (selected: ReadonlySet<string>, chain?: string) =>
  selected.size === 0 || (!!chain && selected.has(chain));
