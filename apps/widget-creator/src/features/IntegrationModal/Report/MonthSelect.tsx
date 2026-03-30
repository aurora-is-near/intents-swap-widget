import clsx from 'clsx';
import { useMemo } from 'react';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
} from '@floating-ui/react';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/react';
import { ChevronLeftW700 as Chevron } from '@material-symbols-svg/react-rounded/icons/chevron-left';
import { CheckCircleFillW700 as Check } from '@material-symbols-svg/react-rounded/icons/check-circle';

export type MonthOption = {
  value: string;
  label: string;
};

export const getMonthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

export const addMonths = (isoDate: string, months: number): string => {
  const d = new Date(isoDate);

  d.setMonth(d.getMonth() + months);
  d.setDate(1);

  return getMonthKey(d);
};

const formatMonthLabel = (isoDate: string): string => {
  const d = new Date(isoDate);

  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const generateMonthOptions = (from: Date, to: Date): MonthOption[] => {
  const options: MonthOption[] = [];
  const start = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  const cursor = new Date(start);

  while (cursor <= end) {
    const value = getMonthKey(cursor);

    options.push({ value, label: formatMonthLabel(value) });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return options;
};

type Props = {
  label: string;
  selected: string;
  onChange: (value: string) => void;
  /** Earliest selectable month — options are generated from here to today. */
  firstMonth: Date;
  /** When set, only months >= this ISO date are shown (for the To field). */
  minMonth?: string;
  /** Render the shortcut pills row above the dropdown. */
  showShortcuts?: boolean;
  /** Base date for computing shortcut values (required when showShortcuts=true). */
  fromDate?: string;
  /** Which shortcut label is currently active. */
  activeShortcut?: string;
  /** Called when a shortcut pill is clicked. */
  onShortcutChange?: (label: string, value: string) => void;
};

export const MonthSelect = ({
  label,
  selected,
  onChange,
  firstMonth,
  minMonth,
  showShortcuts = false,
  fromDate,
  activeShortcut,
  onShortcutChange,
}: Props) => {
  const currentMonthKey = getMonthKey(new Date());

  const allOptions = useMemo(
    () => generateMonthOptions(firstMonth, new Date()),
    [firstMonth.getFullYear(), firstMonth.getMonth()],
  );

  const options = useMemo(() => {
    if (!minMonth) {
      return allOptions;
    }

    return allOptions.filter((o) => o.value >= minMonth);
  }, [allOptions, minMonth]);

  const shortcuts = useMemo(() => {
    if (!showShortcuts || !fromDate) {
      return [];
    }

    const clamp = (d: string) => (d > currentMonthKey ? currentMonthKey : d);

    return [
      { label: 'All time', value: currentMonthKey },
      { label: '1mo', value: clamp(addMonths(fromDate, 1)) },
      { label: '3mo', value: clamp(addMonths(fromDate, 3)) },
      { label: '6mo', value: clamp(addMonths(fromDate, 6)) },
      { label: '1y', value: clamp(addMonths(fromDate, 12)) },
    ];
  }, [showShortcuts, fromDate, currentMonthKey]);

  const selectedLabel =
    options.find((o) => o.value === selected)?.label ?? selected;

  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
          });
        },
      }),
    ],
  });

  return (
    <div className="flex flex-col gap-csw-md">
      <div className="flex items-center justify-between">
        <span className="text-csw-label-md text-csw-gray-50">{label}</span>
        {showShortcuts && shortcuts.length > 0 && (
          <div className="flex items-center gap-csw-lg">
            {shortcuts.map((shortcut) => (
              <button
                key={shortcut.label}
                type="button"
                onClick={() =>
                  onShortcutChange?.(shortcut.label, shortcut.value)
                }
                className={clsx(
                  'text-csw-label-md cursor-pointer transition-colors border-b border-dotted',
                  activeShortcut === shortcut.label
                    ? 'text-csw-gray-50 border-csw-gray-50'
                    : 'text-csw-gray-400 border-csw-gray-600 hover:text-csw-gray-50 hover:border-csw-gray-50',
                )}>
                {shortcut.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div ref={refs.setReference} className="w-full">
        <Listbox value={selected} onChange={onChange}>
          {({ open }) => (
            <>
              <ListboxButton
                className={clsx(
                  'relative outline-none flex items-center justify-between w-full rounded-csw-md bg-csw-gray-800 pl-csw-xl pr-csw-lg py-csw-lg text-csw-label-md text-csw-gray-50 cursor-pointer transition-colors hover:bg-csw-gray-700',
                  'focus:bg-csw-gray-700',
                )}>
                {selectedLabel}
                <Chevron
                  size={20}
                  className={open ? 'rotate-90' : '-rotate-90'}
                />
              </ListboxButton>
              <ListboxOptions
                portal
                modal={false}
                ref={refs.setFloating}
                style={floatingStyles}
                className="rounded-csw-md bg-csw-gray-800 shadow-lg z-[200] focus:outline-none p-csw-2md max-h-[220px] overflow-auto">
                {options.map((option) => (
                  <ListboxOption
                    value={option.value}
                    key={option.value}
                    className="group flex cursor-pointer items-center justify-between gap-csw-md rounded-csw-md p-csw-2md transition-colors hover:bg-csw-gray-700">
                    <div className="text-csw-label-md text-csw-gray-50">
                      {option.label}
                    </div>
                    <Check
                      size={20}
                      className="invisible group-data-selected:visible text-csw-status-success"
                    />
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </>
          )}
        </Listbox>
      </div>
    </div>
  );
};
