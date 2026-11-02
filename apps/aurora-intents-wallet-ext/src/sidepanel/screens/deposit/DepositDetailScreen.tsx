import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  Banner,
  Button,
  CHAIN_ICONS,
  CopyButton,
  useTokens,
} from '@aurora-is-near/intents-swap-widget';
import { CHAINS_LIST } from '@aurora-is-near/intents-swap-widget/constants';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import type { Account } from '../../accounts/types';
import { Icon, Spinner } from '../../components/Icon';
import { QrCode } from '../../components/QrCode';
import { Screen } from '../../components/Screen';
import { DEPOSIT_SYMBOL } from '../../config';
import type { DepositRecord } from '../../deposit/feeService';
import { formatDepositAmount } from '../../deposit/formatDepositAmount';
import { findNetwork } from '../../deposit/networks';
import type { DepositNetwork } from '../../deposit/networks';
import { useDepositAddress } from '../../deposit/useDepositAddress';
import { useDepositProgress } from '../../deposit/useDepositProgress';
import type { DepositProgress } from '../../deposit/useDepositProgress';
import { useNavigation } from '../../navigation';

/** "250 USDT on Arbitrum", from a fee-service deposit record. */
const useDescribe = () => {
  const { tokens } = useTokens();

  return (record: DepositRecord) => {
    // POA may report NEAR token IDs without the `nep141:` prefix.
    const token = tokens.find(
      (item) =>
        !!record.asset_id &&
        (item.assetId === record.asset_id ||
          item.assetId === `nep141:${record.asset_id}`),
    );

    const amount = formatDepositAmount(
      record.amount,
      record.decimals ?? token?.decimals,
    );

    const chain = record.fromChain
      ? CHAINS_LIST[record.fromChain as keyof typeof CHAINS_LIST]?.label
      : undefined;

    // Native NEAR arrives as wrap.near; the user sent NEAR.
    const symbol =
      token?.assetId === 'nep141:wrap.near' ? 'NEAR' : (token?.symbol ?? '');

    return `${amount} ${symbol}${chain ? ` on ${chain}` : ''}`.trim();
  };
};

/**
 * The hash support can trace: the deposit's own transaction, else the failed
 * payout's (1Click reports none for most failures).
 */
const supportHash = (
  progress: Extract<DepositProgress, { status: 'failed' }>,
): string | undefined =>
  // Empty strings count as missing.
  [progress.received?.tx_hash, progress.failed.tx_hash].find(Boolean);

const Step = ({
  state,
  children,
}: {
  state: 'done' | 'active' | 'todo';
  children: ReactNode;
}) => (
  <li className="flex items-center gap-sw-md">
    {state === 'done' && (
      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-sw-status-success text-sw-gray-950">
        <Icon name="check" size={12} />
      </span>
    )}
    {state === 'active' && <Spinner size={18} />}
    {state === 'todo' && (
      <span className="m-[2px] block h-[14px] w-[14px] rounded-full shadow-[inset_0_0_0_2px_var(--c-sw-gray-600)]" />
    )}
    <span
      className={cn(
        'text-sw-label-sm',
        state === 'todo' ? 'text-sw-gray-400' : 'text-sw-gray-100',
      )}>
      {children}
    </span>
  </li>
);

const StatusCard = ({ progress }: { progress: DepositProgress }) => {
  const describe = useDescribe();

  switch (progress.status) {
    case 'pending':
      return (
        <div
          role="status"
          className="flex items-start gap-sw-lg rounded-sw-md bg-sw-gray-900 px-sw-xl py-sw-lg shadow-[inset_0_0_0_1px_var(--c-sw-accent-500)]">
          <Spinner size={18} />
          <div className="flex grow flex-col gap-sw-xs">
            <span className="text-sw-label-md text-sw-gray-50">
              Deposit detected · {describe(progress.received)}
            </span>
            <p className="m-0 text-sw-body-sm text-sw-gray-300">
              Converting to {DEPOSIT_SYMBOL}. This usually takes under a minute.
            </p>
            <ol className="m-0 mt-sw-xs flex list-none flex-col gap-sw-md p-0">
              <Step state="done">Received {describe(progress.received)}</Step>
              <Step state="active">Converting to {DEPOSIT_SYMBOL}</Step>
              <Step state="todo">Credit your account</Step>
            </ol>
          </div>
        </div>
      );

    case 'success':
      return (
        <div
          role="status"
          className="flex items-start gap-sw-lg rounded-sw-md bg-sw-status-success-bg px-sw-xl py-sw-lg">
          <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-sw-status-success text-sw-gray-950">
            <Icon name="check" size={12} />
          </span>
          <div className="flex grow flex-col gap-sw-xs">
            <span className="text-sw-label-md text-sw-status-success">
              {describe(progress.credited)} added to your account
            </span>
            <p className="m-0 text-sw-body-sm text-sw-gray-300">
              {progress.received ? `From ${describe(progress.received)}. ` : ''}
              You can send another deposit to the same address.
            </p>
          </div>
        </div>
      );

    case 'failed':
      return (
        <div
          role="status"
          className="flex items-start gap-sw-lg rounded-sw-md bg-sw-status-error-bg px-sw-xl py-sw-lg">
          <span className="text-sw-status-error">
            <Icon name="close" size={18} />
          </span>
          <div className="flex grow flex-col gap-sw-xs">
            <span className="text-sw-label-md text-sw-status-error">
              Deposit couldn’t be credited
            </span>
            <p className="m-0 text-sw-body-sm text-sw-gray-300">
              {progress.received
                ? `We received ${describe(progress.received)}, but converting it failed. `
                : 'Converting your deposit failed. '}
              {supportHash(progress)
                ? `The funds weren’t lost: contact support with the transaction ${supportHash(progress)}.`
                : 'The funds weren’t lost: contact support with this deposit address.'}
            </p>
          </div>
        </div>
      );

    case 'waiting':
    default:
      return (
        <div
          role="status"
          className="flex items-start gap-sw-lg rounded-sw-md bg-sw-gray-900 px-sw-xl py-sw-lg">
          <Spinner size={18} />
          <div className="flex grow flex-col gap-sw-xs">
            <span className="text-sw-label-md text-sw-gray-50">
              Waiting for deposit…
            </span>
            <p className="m-0 text-sw-body-sm text-sw-gray-300">
              We’re watching this address. Your balance updates automatically
              once a transfer lands.
            </p>
          </div>
        </div>
      );
  }
};

const Networks = ({ network }: { network: DepositNetwork }) => (
  <div className="flex flex-col gap-sw-md">
    <span className="text-sw-label-sm text-sw-gray-100">What you can send</span>
    <p className="m-0 text-sw-body-sm text-sw-gray-300">
      {network.id === 'evm'
        ? 'ETH, USDC, USDT or any supported token on these networks.'
        : `Any supported token on ${network.title}.`}{' '}
      It is converted to {DEPOSIT_SYMBOL} and credited to your account.
    </p>
    <div className="flex flex-wrap gap-sw-sm">
      {network.chains.map((chain) => (
        <span
          key={chain}
          className="flex items-center gap-sw-xs rounded-full bg-sw-gray-900 py-sw-xs pl-sw-xs pr-sw-md">
          <span className="block h-[16px] w-[16px] overflow-hidden rounded-full [&>svg]:h-full [&>svg]:w-full">
            {CHAIN_ICONS[chain]}
          </span>
          <span className="text-sw-label-sm text-sw-gray-200">
            {CHAINS_LIST[chain].label}
          </span>
        </span>
      ))}
    </div>
  </div>
);

export const DepositDetailScreen = ({
  account,
  networkId,
}: {
  account: Account;
  networkId: DepositNetwork['id'];
}) => {
  const { back, reset } = useNavigation();
  const queryClient = useQueryClient();
  const network = findNetwork(networkId);
  const deposit = useDepositAddress(account, network);
  const { progress } = useDepositProgress(deposit.data?.address);
  const kind = network.id === 'evm' ? 'EVM' : network.title;

  // A credited deposit changes the balance: refresh it for Home.
  useEffect(() => {
    if (progress.status === 'success') {
      void queryClient.invalidateQueries({ queryKey: ['intentsBalances'] });
    }
  }, [progress.status, queryClient]);

  if (!deposit.data) {
    return (
      <Screen title={network.title} onBack={back}>
        {deposit.isError ? (
          <>
            <Banner
              className="wrap-banner"
              variant="error"
              message={`Couldn’t get this deposit address: ${deposit.error.message}`}
              hasBg
              multiline
            />
            <Button
              variant="outlined"
              size="md"
              onClick={() => {
                deposit.refetch().catch(() => undefined);
              }}>
              Try again
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-sw-lg py-sw-5xl text-center">
            <Spinner size={32} />
            <p className="m-0 text-sw-body-md text-sw-gray-300">
              Generating your {kind} address…
            </p>
          </div>
        )}
      </Screen>
    );
  }

  const { address, memo } = deposit.data;

  return (
    <Screen
      title={network.title}
      onBack={back}
      footer={
        progress.status === 'success' ? (
          <Button
            variant="primary"
            size="lg"
            onClick={() => reset({ name: 'home' })}>
            View in wallet
          </Button>
        ) : undefined
      }>
      <QrCode value={address} size={168} />
      <div className="flex items-center gap-sw-md rounded-sw-md bg-sw-gray-900 p-sw-lg">
        <div className="flex min-w-[0px] grow flex-col gap-sw-xs">
          <span className="text-sw-label-sm text-sw-gray-300">
            Your {kind} address
          </span>
          <span className="break-all text-sw-label-md tabular-nums text-sw-gray-50">
            {address}
          </span>
        </div>
        <CopyButton value={address} />
      </div>
      {memo ? (
        <div className="flex flex-col gap-sw-md">
          <div className="flex items-center gap-sw-md rounded-sw-md bg-sw-gray-900 p-sw-lg">
            <div className="flex min-w-[0px] grow flex-col gap-sw-xs">
              <span className="text-sw-label-sm text-sw-gray-300">Memo</span>
              <span className="break-all text-sw-label-md tabular-nums text-sw-gray-50">
                {memo}
              </span>
            </div>
            <CopyButton value={memo} />
          </div>
          <Banner
            className="wrap-banner"
            variant="warn"
            message="Include this memo with your transfer. Deposits without it can’t be credited."
            hasBg
            multiline
          />
        </div>
      ) : null}
      <StatusCard progress={progress} />
      <Networks network={network} />
      <Banner
        className="wrap-banner"
        variant="warn"
        message={`Only send from ${network.id === 'evm' ? 'EVM networks' : network.title}. Tokens sent from other chains to this address can’t be recovered.`}
        hasBg
        multiline
      />
    </Screen>
  );
};
