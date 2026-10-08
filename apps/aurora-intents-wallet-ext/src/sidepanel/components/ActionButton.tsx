import { Icon } from './Icon';
import type { IconName } from './Icon';

/** A round action under a balance: Home's Swap / Receive / Send, an asset's. */
export const ActionButton = ({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
  label: string;
  /** No handler: the flow isn't available yet. */
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className="group flex flex-1 flex-col items-center gap-sw-sm text-sw-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
    <span className="flex h-[52px] w-[52px] items-center justify-center rounded-sw-lg bg-sw-accent-500 text-sw-gray-950 transition-colors group-enabled:group-hover:bg-sw-accent-300">
      <Icon name={icon} size={22} />
    </span>
    <span className="text-sw-label-sm text-sw-gray-100 transition-colors group-enabled:group-hover:text-sw-gray-50">
      {label}
    </span>
  </button>
);
