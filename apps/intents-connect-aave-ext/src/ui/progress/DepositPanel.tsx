import type { ReactNode } from 'react';

import { Button, CopyButton, Notice, truncateMiddle } from '../ui';
import { QrCode } from '../wallets/QrCode';
import type { DepositView } from './depositState';

const countdown = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const Line = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-start justify-between gap-3">
    <dt className="shrink-0 text-text-secondary">{label}</dt>
    <dd className="flex min-w-0 items-center gap-1 text-right font-medium">
      {children}
    </dd>
  </div>
);

/**
 * Where to send a transfer, and how much: the deposit address as a QR code
 * (the plain address, which any exchange or wallet scans), the exact
 * amount, the network as exchanges name it, the token's contract, and the
 * memo when the network needs one. Once the deadline passes it says so
 * instead, since funds sent late are only picked up at the service's
 * discretion.
 */
export const DepositPanel = ({
  view,
  address,
  memo,
  amount,
  symbol,
  network,
  contractAddress,
  onStartOver,
  startingOver = false,
}: {
  view: Extract<DepositView, { kind: 'waiting' | 'expired' }>;
  address: string;
  memo?: string | null;
  /** Exact, in whole units: what to type into the exchange. */
  amount: string;
  symbol: string;
  network: string;
  contractAddress?: string;
  onStartOver?: () => void;
  /** Start over is cancelling the run: the wallet signs that. */
  startingOver?: boolean;
}) => {
  if (view.kind === 'expired') {
    return (
      <Notice tone="warning">
        <p className="font-medium">The time to send has passed</p>
        <p className="mt-1 text-text-secondary">
          Don&apos;t send now. If you already sent it, it&apos;s still picked
          up: keep this open to follow it.
        </p>
        {onStartOver ? (
          <>
            <Button
              variant="secondary"
              className="mt-3"
              disabled={startingOver}
              onClick={onStartOver}>
              {startingOver ? 'Sign to cancel…' : 'Start over'}
            </Button>
            <p className="mt-2 text-text-muted">
              Starting over cancels this supply: only if you didn&apos;t send
              anything.
            </p>
          </>
        ) : null}
      </Notice>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <QrCode value={address} />
      <dl className="flex w-full flex-col gap-2 rounded-card bg-surface-raised p-3 shadow-box">
        <Line label="Send exactly">
          <span className="break-all">
            {amount} {symbol}
          </span>
          <CopyButton value={amount} label="amount" />
        </Line>
        <Line label="Network">{network}</Line>
        {contractAddress ? (
          <Line label="Token contract">
            <span title={contractAddress}>
              {truncateMiddle(contractAddress, 6, 4)}
            </span>
            <CopyButton value={contractAddress} label="token contract" />
          </Line>
        ) : null}
        <Line label="To">
          <span title={address}>{truncateMiddle(address, 8, 6)}</span>
          <CopyButton value={address} label="deposit address" />
        </Line>
        {memo ? (
          <Line label="Memo (required)">
            <span className="break-all">{memo}</span>
            <CopyButton value={memo} label="memo" />
          </Line>
        ) : null}
      </dl>
      <p className="w-full text-center text-text-secondary">
        {view.msLeft === undefined
          ? 'Send it soon: the address expires.'
          : `Send within ${countdown(view.msLeft)}.`}{' '}
        If your exchange takes its fee from the amount, add the fee. You can
        close this: reopening brings it back.
      </p>
    </div>
  );
};
