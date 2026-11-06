import type { DetectedWallet } from '@aurora-is-near/intents-connect-wallet/detect';

import { ChevronIcon } from '../ui';
import { WalletIcon } from '../wallets/WalletIcon';
import type { TransferFamily } from './origins';
import { FAMILY_NAME } from './signer';

/**
 * Picks the wallet that signs a transfer from `family`, when none of the
 * family's wallets shares an account yet: picking one connects it.
 */
export const SignerPicker = ({
  family,
  wallets,
  pending,
  error,
  onPick,
}: {
  family: TransferFamily;
  wallets: readonly DetectedWallet[];
  /** The wallet being connected. */
  pending?: string;
  error?: string;
  onPick: (wallet: DetectedWallet) => void;
}) => (
  <div className="flex flex-col gap-3">
    <p className="text-text-secondary">
      A {FAMILY_NAME[family]} wallet signs this transfer once, and a refund
      would go back to it. Nothing is sent from it.
    </p>
    <ul className="overflow-hidden rounded-card bg-surface-raised shadow-box [&>li+li]:shadow-[0_-1px_0_var(--ring)]">
      {wallets.map((wallet) => (
        <li key={wallet.id}>
          <button
            type="button"
            disabled={pending !== undefined}
            onClick={() => onPick(wallet)}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover disabled:cursor-wait">
            <WalletIcon name={wallet.name} icon={wallet.icon} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{wallet.name}</span>
              <span className="block truncate text-text-muted">
                {pending === wallet.id ? 'Check wallet…' : 'Connect to sign'}
              </span>
            </span>
            <span className="text-text-muted">
              <ChevronIcon />
            </span>
          </button>
        </li>
      ))}
    </ul>
    {error ? <p className="text-danger">{error}</p> : null}
  </div>
);
