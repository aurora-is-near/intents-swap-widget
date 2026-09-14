import { Select } from '@base-ui/react/select';

import { BUY_TOKENS } from '../constants';

const items = BUY_TOKENS.map((token) => ({
  value: token.mint,
  label: `${token.symbol} — ${token.name}`,
}));

export const AssetSelect = ({
  value,
  onValueChange,
  disabled,
}: {
  value: string;
  onValueChange: (mint: string) => void;
  disabled: boolean;
}) => (
  <Select.Root
    items={items}
    value={value}
    disabled={disabled}
    onValueChange={(mint) => {
      if (mint !== null) {
        onValueChange(mint);
      }
    }}>
    <div className="flex flex-col gap-sw-sm">
      <Select.Label className="text-sw-label-md text-sw-gray-100">
        You buy
      </Select.Label>
      <Select.Trigger className="group flex w-full items-center justify-between gap-sw-lg rounded-sw-md border border-sw-gray-700 bg-sw-gray-900 px-sw-lg py-sw-lg text-left text-sw-label-md text-sw-gray-100 outline-none transition-colors hover:bg-sw-gray-800 focus-visible:ring-2 focus-visible:ring-sw-accent-500 data-popup-open:border-sw-accent-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-sw-gray-900">
        <Select.Value />
        <Select.Icon className="text-sw-gray-400 transition-transform group-data-popup-open:rotate-180">
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </Select.Icon>
      </Select.Trigger>
    </div>
    <Select.Portal>
      <Select.Positioner
        className="sw z-50"
        alignItemWithTrigger={false}
        sideOffset={6}>
        <Select.Popup className="w-[var(--anchor-width)] max-w-[var(--available-width)] overflow-hidden rounded-sw-md border border-sw-gray-700 bg-sw-gray-900 text-sw-gray-100 shadow-lg outline-none">
          <Select.List className="max-h-[var(--available-height)] overflow-y-auto p-sw-xs">
            {items.map((item) => (
              <Select.Item
                key={item.value}
                value={item.value}
                className="flex cursor-pointer items-center justify-between gap-sw-lg rounded-sw-sm px-sw-md py-sw-lg text-sw-label-md outline-none select-none data-highlighted:bg-sw-gray-800 data-selected:text-sw-accent-500">
                <Select.ItemText>{item.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.List>
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  </Select.Root>
);
