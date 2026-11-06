import type { ReactNode } from 'react';

import { ChainIcon } from '../assets/ChainIcon';
import { TokenLogo } from '../assets/TokenLogo';
import { Button, CopyButton, Notice, truncateMiddle } from '../ui';
import { QrCode } from '../wallets/QrCode';
import type { DepositView } from './depositState';

/** One of the three: a small label over its value. */
const Cell = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-xs text-text-muted">{label}</dt>
    <dd className="mt-1 flex min-w-0 items-center gap-1 font-medium">
      {children}
    </dd>
  </div>
);

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
  chain,
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
  /** The chain id, for its icon. */
  chain: string;
  /** As exchanges name it, e.g. "Ethereum (ERC-20)". */
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
      <dl className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-4 rounded-card bg-surface-raised p-3 shadow-box">
        <Cell label="Send exactly">
          <TokenLogo symbol={symbol} size={16} />
          <span className="min-w-0 break-all">
            {amount} {symbol}
          </span>
          <CopyButton value={amount} label="amount" />
        </Cell>
        <Cell label="Network">
          <ChainIcon chain={chain} />
          <span className="min-w-0 break-words" title={network}>
            {network}
          </span>
        </Cell>
        <Cell label="To">
          <span className="min-w-0 truncate" title={address}>
            {truncateMiddle(address, 4, 4)}
          </span>
          <CopyButton value={address} label="deposit address" />
        </Cell>
      </dl>
      {(contractAddress ?? memo) ? (
        <dl className="flex w-full flex-col gap-2 rounded-card bg-surface-raised p-3 shadow-box">
          {contractAddress ? (
            <Line label="Token contract">
              <span title={contractAddress}>
                {truncateMiddle(contractAddress, 6, 4)}
              </span>
              <CopyButton value={contractAddress} label="token contract" />
            </Line>
          ) : null}
          {memo ? (
            <Line label="Memo (required)">
              <span className="break-all">{memo}</span>
              <CopyButton value={memo} label="memo" />
            </Line>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
};
