import { useState } from 'react';
import { KeyboardArrowDownW700 as ExpandMore } from '@material-symbols-svg/react-rounded/icons/keyboard-arrow-down';

import { Badge, Button, Card, Icon } from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import { AddressRow } from '../../../components/AddressRow';
import { shortAddress } from '../../../utils';
import type { WalletOption } from '../../../wallet/types';
import type { WalletSelection } from '../../../wallet/useWalletSelection';

type Props = {
  selection: WalletSelection;
  /** A deposit is running: the signer must not change under it. */
  isLocked: boolean;
};

const FAMILY_LABEL = { evm: 'EVM', sol: 'Solana', near: 'NEAR' } as const;

const CONNECTION_HINT = {
  site: 'Connected on Polymarket',
  extension: 'Connected to Intents Connect',
} as const;

const FamilyBadge = ({ wallet }: { wallet: WalletOption }) => (
  <Badge className="ml-0">{FAMILY_LABEL[wallet.family]}</Badge>
);

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? '' : 's'}`;

const statusLine = (wallet: WalletOption) => {
  if (!wallet.address) {
    return 'Not connected';
  }

  const where = wallet.connection === 'site' ? 'on Polymarket' : 'to extension';

  return `${shortAddress(wallet.address)} · ${where}`;
};

const WalletRow = ({
  wallet,
  isConnecting,
  isDisabled,
  error,
  onSelect,
}: {
  wallet: WalletOption;
  isConnecting: boolean;
  isDisabled: boolean;
  error?: string;
  onSelect: () => void;
}) => {
  let action = wallet.address ? 'Switch' : 'Connect';

  if (isConnecting) {
    action = 'Check wallet…';
  }

  return (
    <li className="flex flex-col gap-sw-xs">
      <button
        type="button"
        disabled={isDisabled}
        className={cn(
          'flex items-center gap-sw-md w-full p-sw-md rounded-sw-md text-left transition-colors',
          isDisabled
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:bg-sw-gray-800',
        )}
        onClick={onSelect}>
        <Icon
          label={wallet.info.name}
          icon={wallet.info.icon}
          size={28}
          radius={8}
        />
        <span className="flex flex-col gap-sw-xxs grow min-w-0">
          <span className="flex items-center gap-sw-sm">
            <span className="text-sw-label-md text-sw-gray-50 truncate">
              {wallet.info.name}
            </span>
            <FamilyBadge wallet={wallet} />
          </span>
          <span className="text-sw-body-sm text-sw-gray-400">
            {statusLine(wallet)}
          </span>
        </span>
        <span className="shrink-0 text-sw-label-sm text-sw-accent-500">
          {action}
        </span>
      </button>
      {!!error && (
        <span className="px-sw-md text-sw-body-sm text-sw-status-error">
          {error}
        </span>
      )}
    </li>
  );
};

/**
 * The wallet that signs and sends the deposit. Shows the selected one; the
 * other detected wallets (EVM and Solana) are one click away. Connecting one
 * connects it to the extension — never to the site.
 */
export const WalletCard = ({ selection, isLocked }: Props) => {
  const { selected, options, connecting, error } = selection;
  const others = options.filter((wallet) => wallet.id !== selected?.id);
  const [isOpen, setIsOpen] = useState(false);

  // Nothing to show until a wallet is picked, so the list is the content.
  const isListOpen = isOpen || !selected;

  return (
    <Card className="flex flex-col gap-sw-lg">
      <div className="flex items-center justify-between gap-sw-md">
        <span className="text-sw-label-md text-sw-gray-50">Wallet</span>
        <span className="text-sw-body-sm text-sw-gray-400">
          {selected ? CONNECTION_HINT[selected.connection] : ''}
        </span>
      </div>

      {selected ? (
        <div className="flex flex-col gap-sw-md">
          <div className="flex items-center gap-sw-md">
            <Icon
              label={selected.info.name}
              icon={selected.info.icon}
              size={24}
              radius={6}
            />
            <span className="text-sw-label-md text-sw-gray-100">
              {selected.info.name}
            </span>
            <FamilyBadge wallet={selected} />
            {selected.connection === 'extension' && !isLocked && (
              <Button
                size="sm"
                variant="outlined"
                className="ml-auto w-fit"
                onClick={() => {
                  void selection.disconnect(selected.id);
                }}>
                Disconnect
              </Button>
            )}
          </div>
          <AddressRow label="Address" address={selected.address} />
        </div>
      ) : (
        <span className="text-sw-body-sm text-sw-gray-400">
          {others.length > 0
            ? 'Pick the wallet to deposit with.'
            : 'No wallets found. Install MetaMask, Phantom or another browser wallet, then reload Polymarket.'}
        </span>
      )}

      {others.length > 0 && (
        <div className="flex flex-col gap-sw-sm">
          {!!selected && (
            <button
              type="button"
              aria-expanded={isListOpen}
              className="flex items-center gap-sw-xs w-fit text-sw-label-sm text-sw-gray-300 hover:text-sw-gray-50 transition-colors cursor-pointer"
              onClick={() => setIsOpen((open) => !open)}>
              {plural(others.length, 'more wallet')} detected
              <ExpandMore
                className={cn('w-sw-xl h-sw-xl transition-transform', {
                  'rotate-180': isListOpen,
                })}
              />
            </button>
          )}

          {isListOpen && (
            <>
              <ul className="flex flex-col -mx-sw-md">
                {others.map((wallet) => (
                  <WalletRow
                    key={wallet.id}
                    wallet={wallet}
                    isConnecting={connecting === wallet.id}
                    isDisabled={isLocked || connecting !== null}
                    error={
                      error?.walletId === wallet.id ? error.message : undefined
                    }
                    onSelect={() => {
                      void selection.select(wallet.id).then((isSelected) => {
                        // Stay open on a refusal so its error stays visible.
                        if (isSelected) {
                          setIsOpen(false);
                        }
                      });
                    }}
                  />
                ))}
              </ul>
              <span className="text-sw-body-sm text-sw-gray-400">
                Wallets you connect here are connected to Intents Connect, not
                to Polymarket. Their prompts open from a small Intents Connect
                window.
              </span>
            </>
          )}
        </div>
      )}
    </Card>
  );
};
