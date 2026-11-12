import { type ReactNode, useEffect, useRef, useState } from 'react';

import { useDisclosure } from './a11y';
import { ChainIcon } from './assets/ChainIcon';
import { chainLabel } from './assets/tokens';
import { ChevronIcon, cx } from './ui';

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

const summaryOf = (selected: ReadonlySet<string>) => {
  const names = [...selected].map(chainLabel);

  if (names.length === 0) {
    return 'All networks';
  }

  return names.length > 2
    ? `${names.slice(0, 2).join(', ')} +${names.length - 2}`
    : names.join(', ');
};

/**
 * Networks to filter a list by, for many of them: "All" as a chip, then a
 * dropdown of checkboxes (several at once). It opens below its trigger and
 * closes on Escape (focus back on the trigger) or a press outside.
 */
export const ChainSelect = ({
  label,
  chains,
  selected,
  onChange,
}: {
  /** Names the checkbox group for screen readers, e.g. "Networks". */
  label: string;
  chains: readonly string[];
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
}) => {
  const [open, setOpen] = useState(false);
  const { triggerProps, panelProps } = useDisclosure(open);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const picked = [...selected];

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onPress = (event: PointerEvent) => {
      if (root.current && !event.composedPath().includes(root.current)) {
        setOpen(false);
      }
    };

    // Claimed before the dialog hears it: Escape closes this, not the
    // dialog, and puts focus back on the trigger.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPress, true);
    document.addEventListener('keydown', onKey, true);

    return () => {
      document.removeEventListener('pointerdown', onPress, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div ref={root} className="relative flex items-center gap-1.5">
      <Chip pressed={selected.size === 0} onClick={() => onChange(new Set())}>
        All
      </Chip>
      <button
        ref={trigger}
        type="button"
        {...triggerProps}
        onClick={() => setOpen((value) => !value)}
        className={cx(
          'inline-flex h-7 min-w-0 flex-1 items-center justify-between gap-2 rounded-chip px-2.5 text-xs font-medium transition-colors',
          selected.size
            ? 'bg-control text-text-primary shadow-box'
            : 'bg-track text-text-secondary hover:text-text-primary',
        )}>
        <span className="flex min-w-0 items-center gap-1.5">
          {picked.slice(0, 3).map((chain) => (
            <ChainIcon key={chain} chain={chain} size={14} />
          ))}
          <span className="truncate">{summaryOf(selected)}</span>
        </span>
        <span
          aria-hidden="true"
          className={cx(
            'transition-transform',
            open ? '-rotate-90' : 'rotate-90',
          )}>
          <ChevronIcon />
        </span>
      </button>
      <div
        {...panelProps}
        role="group"
        aria-label={label}
        hidden={!open}
        className="absolute top-full right-0 left-0 z-10 mt-1 max-h-60 overflow-y-auto rounded-card bg-surface p-1 shadow-dialog">
        {chains.map((chain) => (
          <label
            key={chain}
            className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 hover:bg-surface-hover">
            <input
              type="checkbox"
              checked={selected.has(chain)}
              onChange={() => onChange(toggle(selected, chain, chains))}
              className="accent-[var(--cta)]"
            />
            <ChainIcon chain={chain} />
            <span>{chainLabel(chain)}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
