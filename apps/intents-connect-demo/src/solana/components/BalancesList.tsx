import { useEffect, useRef, useState } from 'react';
import { Banner, CopyButton } from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';
import type { Phase } from '@aurora-is-near/intents-connect';
import {
  useExecution,
  useIntentsConnect,
} from '@aurora-is-near/intents-connect/react';

import { useAvailableHeight } from '../../shared/hooks/useAvailableHeight';
import { useSolanaBalances } from '../hooks/useSolanaBalances';
import { useSolanaSpend } from '../hooks/useSolanaSpend';
import { SOLANA_USDC } from '../constants';
import type { SolanaToken } from '../constants';
import { getSolanaConnection } from '../client';
import { buildSolanaSellPlan, previewSolanaSell } from '../sell';
import { buildSolanaWithdrawPlan, previewSolanaWithdraw } from '../withdraw';
import { SpendRow } from './SpendRow';
import type { SpendKind } from './SpendRow';

export const BalancesList = ({
  phase,
  isLocked,
  onBusyChange,
}: {
  /** The buy card's phase — a settled purchase refreshes the list. */
  phase: Phase;
  /** The buy card is running: no sell or withdraw may start. */
  isLocked: boolean;
  onBusyChange: (busy: boolean) => void;
}) => {
  // Its own runner: a sale must not repaint the buy card's status, and the
  // per-wallet in-flight lock still serialises the two server-side.
  const spendExec = useExecution();
  const { wallet } = useIntentsConnect();
  const { data, error, isPending, isFetching, address, refetch } =
    useSolanaBalances(phase, spendExec.phase);

  const [isOpen, setIsOpen] = useState(true);
  // The token object, not just its mint: a sold or withdrawn balance drops
  // out of the fetched list, and the row has to survive that to show its
  // result — and to be closable, which is what releases the other rows.
  const [active, setActive] = useState<SolanaToken & { amount: string }>();
  const [recipient, setRecipient] = useState('');
  const [isPreparing, setIsPreparing] = useState(false);
  const [spendError, setSpendError] = useState<Error>();
  const listRef = useRef<HTMLDivElement>(null);
  const held = data?.balances.filter(({ amount }) => BigInt(amount) > 0n) ?? [];

  const balances =
    active && !held.some((token) => token.mint === active.mint)
      ? [...held, active]
      : held;

  const kind: SpendKind =
    active?.mint === SOLANA_USDC.mint ? 'withdraw' : 'sell';

  const isBusy = spendExec.isBusy || isPreparing;

  const inputKey = JSON.stringify([
    wallet?.signingStandard,
    wallet?.getAddress(),
    active?.mint,
    active?.amount,
    kind === 'withdraw' ? recipient.trim() : '',
  ]);

  const { quote, quoteMoved, isCommitted, execute, clear } = useSolanaSpend({
    exec: spendExec,
    inputKey,
  });

  // Read through a ref so a parent passing a fresh callback per render does
  // not re-run the effect (and re-propagate an unchanged value) every render.
  const onBusyChangeRef = useRef(onBusyChange);

  onBusyChangeRef.current = onBusyChange;

  useEffect(() => onBusyChangeRef.current(isBusy), [isBusy]);

  const maxHeight = useAvailableHeight(listRef, isOpen && balances.length > 0, [
    balances.length,
    isPending,
    active?.mint,
    !!quote,
    spendExec.phase,
  ]);

  const open = (token: SolanaToken & { amount: string }) => {
    setSpendError(undefined);

    if (token.mint === SOLANA_USDC.mint && !recipient) {
      // Prefill with the connected wallet when it is itself a Solana wallet.
      setRecipient(
        wallet?.chains.includes('sol') ? (wallet.getAddress() ?? '') : '',
      );
    }

    setActive(token);
  };

  const close = () => {
    setActive(undefined);
    setSpendError(undefined);
    clear();
  };

  const run = async () => {
    if (!active || !data || isBusy) {
      return;
    }

    setIsPreparing(true);
    setSpendError(undefined);

    try {
      if (kind === 'withdraw') {
        const plan = buildSolanaWithdrawPlan({
          amount: active.amount,
          recipient,
        });

        await execute(() =>
          previewSolanaWithdraw(spendExec, plan, getSolanaConnection()),
        );
      } else {
        const plan = buildSolanaSellPlan({
          token: active,
          amount: active.amount,
        });

        await execute(() =>
          previewSolanaSell(spendExec, plan, active, data.intermediary),
        );
      }
    } catch (caught) {
      setSpendError(
        caught instanceof Error ? caught : new Error(String(caught)),
      );
    } finally {
      setIsPreparing(false);
    }
  };

  const body = () => {
    if (!address) {
      return <p>Connect a wallet to see its Solana assets</p>;
    }

    if (error) {
      return (
        <Banner
          hasBg
          multiline
          variant="error"
          message={`Could not load balances — ${error.message}`}
        />
      );
    }

    if (isPending) {
      return (
        <div
          className="h-[86px] animate-pulse rounded-sw-lg bg-sw-gray-900"
          aria-label="Loading balances"
        />
      );
    }

    return (
      <>
        {data && (
          <div className="flex items-center justify-between px-sw-md gap-sw-md">
            <a
              href={`https://explorer.solana.com/address/${data.intermediary}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
              title={data.intermediary}>
              Connect account {data.intermediary.slice(0, 6)}…
              {data.intermediary.slice(-4)}
            </a>
            <CopyButton value={data.intermediary} />
          </div>
        )}
        {balances.length === 0 ? (
          <p>No assets yet. Buy a token above to add it here.</p>
        ) : (
          <ul className="flex flex-col gap-sw-md">
            {balances.map((token) => {
              const isActive = token.mint === active?.mint;

              return (
                <SpendRow
                  key={token.mint}
                  // The active row keeps the balance it was opened with; the
                  // list may already show it gone.
                  token={isActive && active ? active : token}
                  kind={token.mint === SOLANA_USDC.mint ? 'withdraw' : 'sell'}
                  isActive={isActive}
                  isLocked={isLocked || isBusy || (!!active && !isActive)}
                  isBusy={isActive && isBusy}
                  exec={spendExec}
                  quote={isActive ? quote : undefined}
                  quoteMoved={isActive && quoteMoved}
                  isCommitted={isActive && isCommitted}
                  // Only this row's own failure: runner errors surface through
                  // `execute()` and land in `spendError`, so the runner's last
                  // error is never read directly — it outlives the row it
                  // belonged to.
                  error={isActive ? spendError : undefined}
                  recipient={recipient}
                  onRecipientChange={setRecipient}
                  onOpen={() => open(token)}
                  onClose={close}
                  onExecute={() => {
                    void run();
                  }}
                />
              );
            })}
          </ul>
        )}
        <p className="px-sw-md">
          Assets stay in your Connect account until you sell them for USDC or
          withdraw the USDC to a Solana wallet.
        </p>
      </>
    );
  };

  return (
    <section className="flex flex-col w-full mx-auto max-w-[456px] gap-sw-lg mt-sw-4xl">
      <div className="flex items-center justify-between gap-sw-lg px-sw-md">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
          className="flex items-center gap-sw-sm cursor-pointer text-sw-gray-100 h-[36px]">
          <h2 className="text-sw-label-lg">Your Solana assets</h2>
          <span aria-hidden="true">{isOpen ? '⌃' : '⌄'}</span>
        </button>
        {isOpen && !!address && (
          <button
            type="button"
            aria-label="Refresh balances"
            title="Refresh"
            disabled={isFetching}
            onClick={() => {
              void refetch();
            }}
            className="p-sw-sm rounded-sw-sm text-sw-gray-400 hover:text-sw-gray-100 hover:bg-sw-gray-800">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={cn('h-sw-xl w-sw-xl', { 'animate-spin': isFetching })}>
              <path
                d="M20 11.5a8 8 0 1 0-.6 3.5M20 5v6h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
      {isOpen && (
        <div
          ref={listRef}
          style={{ maxHeight }}
          className="flex flex-col gap-sw-md text-sw-body-sm text-sw-gray-400 overflow-y-auto pr-sw-xs">
          {body()}
        </div>
      )}
    </section>
  );
};
