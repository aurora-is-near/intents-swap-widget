import { Icon } from '../../components/Icon';
import { shortAddress } from '../../utils';
import type { WalletOption } from './walletOptions';

type Props = {
  /** Before the wallet, e.g. "From". */
  label?: string;
  option: WalletOption;
  ariaLabel: string;
  onClick: () => void;
};

/**
 * The selected wallet (or the account) as a full-width card that opens the
 * wallet picker: Home's wallets tab, and "From" on Swap and Send.
 */
export const WalletSelector = ({
  label,
  option,
  ariaLabel,
  onClick,
}: Props) => (
  <button
    type="button"
    aria-label={ariaLabel}
    onClick={onClick}
    className="flex w-full shrink-0 items-center gap-sw-md rounded-sw-md bg-sw-gray-900 px-sw-lg py-sw-md text-left hover:bg-sw-gray-800">
    {label ? (
      <span className="shrink-0 text-sw-label-sm text-sw-gray-300">
        {label}
      </span>
    ) : null}
    {option.icon(24)}
    <span className="flex min-w-[0px] grow items-baseline gap-sw-sm">
      <span className="truncate text-sw-label-md text-sw-gray-50">
        {option.name}
      </span>
      {option.address ? (
        <span className="shrink-0 text-sw-label-sm text-sw-gray-400">
          {shortAddress(option.address)}
        </span>
      ) : null}
    </span>
    <span className="shrink-0 text-sw-gray-300">
      <Icon name="chevronDown" size={16} />
    </span>
  </button>
);
