import { useState } from 'react';

import { Button, Input } from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import { isPolygonAddress } from '../../apps/polymarket/account';
import { PUSD_DECIMALS } from '../../apps/polymarket/constants';
import type { usePolymarketAccount } from '../../apps/polymarket/usePolymarketAccount';
import { INTEGRATIONS } from '../../apps/registry';
import { AppMark } from '../../components/AppMark';
import { Icon } from '../../components/Icon';
import { formatAmount, shortAddress } from '../../utils';

const POLYMARKET = INTEGRATIONS[0]!;

type Props = {
  account: ReturnType<typeof usePolymarketAccount>;
  /** pUSD, atomic; undefined while it loads. */
  balance: bigint | undefined;
  isLocked: boolean;
};

const SOURCE_HINTS = {
  saved: 'Saved',
  wallet: '',
  site: 'From polymarket.com',
  none: '',
} as const;

/**
 * The Polymarket account the pUSD lands in: shown with its balance, or a
 * field to enter it (when none was found, or to change it).
 */
export const PolymarketAccountCard = ({
  account,
  balance,
  isLocked,
}: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const showForm = isEditing || (!account.isLoading && !account.isValid);
  const isDraftInvalid = draft.trim() !== '' && !isPolygonAddress(draft.trim());

  const save = async () => {
    await account.save(draft.trim());
    setIsEditing(false);
  };

  return (
    <div className="flex shrink-0 flex-col gap-sw-lg rounded-sw-lg bg-sw-gray-900 p-sw-xl">
      <div className="flex items-center gap-sw-lg">
        <AppMark app={POLYMARKET} />
        <div className="flex min-w-[0px] grow flex-col gap-sw-xs">
          <span className="text-sw-label-md text-sw-gray-50">
            Polymarket account
          </span>
          {!showForm && account.isValid ? (
            <span className="truncate text-sw-label-sm text-sw-gray-300">
              {shortAddress(account.address)} · Polygon
              {SOURCE_HINTS[account.source]
                ? ` · ${SOURCE_HINTS[account.source]}`
                : ''}
            </span>
          ) : null}
          {account.isLoading && !isEditing ? (
            <span className="text-sw-label-sm text-sw-gray-400">
              Looking for your account…
            </span>
          ) : null}
        </div>
        {!showForm && account.isValid ? (
          <button
            type="button"
            aria-label="Edit Polymarket account"
            title="Edit"
            disabled={isLocked}
            onClick={() => {
              setDraft(account.address);
              setIsEditing(true);
            }}
            className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-sw-md bg-sw-gray-800 text-sw-gray-200 hover:text-sw-gray-50 disabled:opacity-50">
            <Icon name="edit" size={16} />
          </button>
        ) : null}
      </div>

      {showForm ? (
        <div className="flex flex-col gap-sw-md">
          <Input
            fontSize="sm"
            placeholder="0x…"
            defaultValue={draft}
            state={isDraftInvalid ? 'error' : 'default'}
            onChange={(event) => setDraft(event.target.value)}
          />
          <p
            className={cn(
              'm-0 text-sw-body-sm',
              isDraftInvalid ? 'text-sw-status-error' : 'text-sw-gray-300',
            )}>
            {isDraftInvalid
              ? 'Not a valid Polygon address. It should start with 0x and be 42 characters.'
              : 'Log in to polymarket.com and hover the account icon to find it. This is your Polymarket account, not your wallet.'}
          </p>
          <div className="flex gap-sw-md">
            <Button
              variant="outlined"
              size="md"
              state={draft.trim() && !isDraftInvalid ? 'default' : 'disabled'}
              onClick={() => {
                void save();
              }}>
              Save account
            </Button>
            {isEditing ? (
              <Button
                variant="outlined"
                size="md"
                onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            ) : null}
            {isEditing && account.source === 'saved' ? (
              <Button
                variant="outlined"
                size="md"
                onClick={() => {
                  void account.reset().then(() => setIsEditing(false));
                }}>
                Find automatically
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!showForm && account.isValid ? (
        <div className="flex items-baseline justify-between border-t border-sw-gray-800 pt-sw-lg">
          <span className="text-sw-label-sm text-sw-gray-300">Balance</span>
          <span className="flex items-baseline gap-sw-xs">
            <span className="text-sw-h5 text-sw-gray-50">
              {balance === undefined
                ? '—'
                : formatAmount(Number(balance) / 10 ** PUSD_DECIMALS)}
            </span>
            <span className="text-sw-label-sm text-sw-gray-300">pUSD</span>
          </span>
        </div>
      ) : null}
    </div>
  );
};
