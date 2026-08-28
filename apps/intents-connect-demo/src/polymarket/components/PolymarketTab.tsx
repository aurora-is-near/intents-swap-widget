import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';

import { Input } from '@aurora-is-near/intents-swap-widget';
import { useExecution } from '@aurora-is-near/intents-connect/react';
import type { Token } from '@aurora-is-near/intents-swap-widget';

import { Layout } from '../../shared/components/Layout';
import { PolymarketBalance } from './PolymarketBalance';
import { ALCHEMY_API_KEY } from '../../shared/config';
import { DEST_TOKEN } from '../constants';
import { isPolygonAddress } from '../hooks/usePolymarketBalance';
import { buildPolymarketPlan } from '../plan';

const fieldState = (isDisabled: boolean, isInvalid: boolean) => {
  if (isDisabled) {
    return 'disabled' as const;
  }

  return isInvalid ? ('error' as const) : ('default' as const);
};

const AccountField = ({
  account,
  isInvalid,
  isDisabled,
  onChange,
}: {
  account: string;
  isInvalid: boolean;
  isDisabled: boolean;
  onChange: (value: string) => void;
}) => (
  <div className="flex flex-col gap-sw-xs">
    <span className="text-sw-label-md text-sw-gray-100">
      Polymarket account
    </span>
    {/* `Input` keeps its own state and re-syncs from defaultValue, so it is
        driven with defaultValue + onChange rather than a value prop. */}
    <Input
      fontSize="sm"
      defaultValue={account}
      state={fieldState(isDisabled, isInvalid)}
      placeholder="0x…"
      onChange={(event) => onChange(event.target.value.trim())}
    />
    <span className="text-sw-body-sm text-sw-gray-400">
      {isInvalid
        ? 'Not a valid Polygon address'
        : 'Log in to polymarket.com and hover the account icon to find it'}
    </span>
  </div>
);

export const PolymarketTab = ({
  HeaderComponent,
  account,
  onAccountChange,
  onBusyChange,
}: {
  HeaderComponent: ReactElement;
  /** Held by the parent so it survives a tab switch, as the amount does. */
  account: string;
  onAccountChange: (account: string) => void;
  onBusyChange: (isBusy: boolean) => void;
}) => {
  const exec = useExecution();
  const [isBusy, setIsBusy] = useState(false);

  const isValid = isPolygonAddress(account);

  // The address is a recipe param, so it has to be closed over here — the
  // shared BuildPlanFn signature carries only token/amount/deposit mode.
  const buildPlan = useCallback(
    (args: { token: Token; amountAtomic: string; depositViaWallet: boolean }) =>
      buildPolymarketPlan({ ...args, account }),
    [account],
  );

  return (
    <>
      <Layout
        exec={exec}
        HeaderComponent={HeaderComponent}
        alchemyApiKey={ALCHEMY_API_KEY}
        buildPlan={buildPlan}
        destinationToken={DEST_TOKEN}
        submitLabel="Deposit to Polymarket"
        successMessage="Deposited to your Polymarket account"
        isReady={isValid}
        FieldsComponent={
          <AccountField
            account={account}
            isDisabled={isBusy}
            isInvalid={account.length > 0 && !isValid}
            onChange={onAccountChange}
          />
        }
        onBusyChange={(busy) => {
          setIsBusy(busy);
          onBusyChange(busy);
        }}
      />

      <PolymarketBalance account={account} phase={exec.phase} />
    </>
  );
};
