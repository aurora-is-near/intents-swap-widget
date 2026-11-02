import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import { Icon } from './Icon';
import type { IconName } from './Icon';

/** A round action under a balance: Home's Swap / Receive / Send, an asset's. */
export const ActionButton = ({
  icon,
  label,
  tone = 'accent',
  onClick,
}: {
  icon: IconName;
  label: string;
  /** `light` sets an action apart from the money flows (Home's Apps). */
  tone?: 'accent' | 'light';
  /** No handler: the flow isn't available yet. */
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className="group flex flex-1 flex-col items-center gap-sw-sm text-sw-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
    <span
      className={cn(
        'flex h-[52px] w-[52px] items-center justify-center rounded-sw-lg text-sw-gray-950 transition-colors',
        tone === 'accent'
          ? 'bg-sw-accent-500 group-enabled:group-hover:bg-sw-accent-300'
          : 'bg-sw-gray-50 group-enabled:group-hover:bg-sw-gray-200',
      )}>
      <Icon name={icon} size={22} />
    </span>
    <span className="text-sw-label-sm text-sw-gray-100 transition-colors group-enabled:group-hover:text-sw-gray-50">
      {label}
    </span>
  </button>
);
