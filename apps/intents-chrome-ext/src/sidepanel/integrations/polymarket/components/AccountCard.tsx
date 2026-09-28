import { useState } from 'react';

import {
  Button,
  Card,
  Input,
  Skeleton,
  TinyNumber,
} from '@aurora-is-near/intents-swap-widget';
import type { Phase } from '@aurora-is-near/intents-connect';

import { AddressRow } from '../../../components/AddressRow';
import { PUSD_DECIMALS } from '../constants';
import { isPolygonAddress } from '../hooks/usePolymarketAccount';
import type { usePolymarketAccount } from '../hooks/usePolymarketAccount';
import { usePolymarketBalance } from '../hooks/usePolymarketBalance';

type Props = {
  account: ReturnType<typeof usePolymarketAccount>;
  phase: Phase;
  isLocked: boolean;
};

const Balance = ({ account, phase }: { account: string; phase: Phase }) => {
  const balance = usePolymarketBalance(account, phase);

  return (
    <div className="flex items-center justify-between gap-sw-md">
      <span className="text-sw-body-md text-sw-gray-400">Balance</span>
      <span className="text-sw-label-md text-sw-gray-100">
        {balance.data === undefined ? (
          <Skeleton width={64} height={16} />
        ) : (
          <>
            <TinyNumber
              value={balance.data.toString()}
              decimals={PUSD_DECIMALS}
            />{' '}
            pUSD
          </>
        )}
      </span>
    </div>
  );
};

export const AccountCard = ({ account, phase, isLocked }: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const showEditor = isEditing || (!account.isLoading && !account.account);
  const isDraftInvalid = draft.length > 0 && !isPolygonAddress(draft);

  let editorHint = 'The address that receives the pUSD.';

  if (isDraftInvalid) {
    editorHint = 'Not a valid Polygon address';
  } else if (account.isNotFound || account.error) {
    editorHint =
      "We couldn't detect your Polymarket account. Hover the account icon on polymarket.com to find it.";
  }

  return (
    <Card className="flex flex-col gap-sw-lg">
      <div className="flex items-center justify-between gap-sw-md">
        <span className="text-sw-label-md text-sw-gray-50">
          Polymarket account
        </span>
        {!showEditor && !isLocked && (
          <Button
            size="sm"
            variant="outlined"
            className="w-fit"
            onClick={() => {
              setDraft(account.account);
              setIsEditing(true);
            }}>
            Edit
          </Button>
        )}
      </div>

      {account.isLoading && <Skeleton height={20} />}

      {!account.isLoading && !showEditor && (
        <>
          <AddressRow
            label={account.source === 'auto' ? 'Detected' : 'Entered'}
            address={account.account}
          />
          <Balance account={account.account} phase={phase} />
        </>
      )}

      {showEditor && (
        <div className="flex flex-col gap-sw-md">
          <Input
            fontSize="sm"
            defaultValue={draft}
            placeholder="0x…"
            state={isDraftInvalid ? 'error' : 'default'}
            onChange={(event) => setDraft(event.target.value.trim())}
          />
          <span className="text-sw-body-sm text-sw-gray-400">{editorHint}</span>
          <div className="flex gap-sw-md">
            <Button
              size="sm"
              variant="primary"
              state={isPolygonAddress(draft) ? 'default' : 'disabled'}
              onClick={() => {
                account.setManual(draft);
                setIsEditing(false);
              }}>
              Save
            </Button>
            {isEditing && (
              <Button
                size="sm"
                variant="outlined"
                onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            )}
            {account.source === 'manual' && (
              <Button
                size="sm"
                variant="outlined"
                onClick={() => {
                  account.resetManual();
                  setIsEditing(false);
                }}>
                Use detected
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
