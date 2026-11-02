import { cn } from '@aurora-is-near/intents-swap-widget/utils';

type Props<T extends string> = {
  label: string;
  tabs: ReadonlyArray<readonly [T, string]>;
  value: T;
  onChange: (tab: T) => void;
};

/** A segmented toggle: Home's Account / Connected wallet, Send / Swap. */
export const Tabs = <T extends string>({
  label,
  tabs,
  value,
  onChange,
}: Props<T>) => (
  <div
    role="tablist"
    aria-label={label}
    className="flex shrink-0 gap-sw-xs rounded-sw-md bg-sw-gray-900 p-sw-xs">
    {tabs.map(([tab, title]) => (
      <button
        key={tab}
        type="button"
        role="tab"
        aria-selected={value === tab}
        onClick={() => onChange(tab)}
        className={cn(
          'flex-1 rounded-sw-sm px-sw-md py-sw-sm text-sw-label-sm transition-colors',
          value === tab
            ? 'bg-sw-gray-700 text-sw-gray-50'
            : 'text-sw-gray-300 hover:text-sw-gray-50',
        )}>
        {title}
      </button>
    ))}
  </div>
);
