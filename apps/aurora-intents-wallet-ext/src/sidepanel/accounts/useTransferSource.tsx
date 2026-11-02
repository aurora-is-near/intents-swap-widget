import { createContext, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import type { ConnectedWallet, SecondaryWallet } from './types';
import { useAccounts } from './useAccounts';

/**
 * Where funds are spent from: the primary — the account's own wallet and its
 * intents balance (only the intents balance for a passkey) — or one of its
 * secondary wallets (only that wallet's tokens).
 */
export type TransferSource =
  | { kind: 'primary' }
  | { kind: 'secondary'; id: string };

type Selection = {
  source: TransferSource;
  /** The selected secondary wallet; null for the primary. */
  secondary: SecondaryWallet | null;
  /**
   * The wallet the widget is configured with — whose on-chain balances show
   * and whose provider signs: the secondary, else the account's own wallet
   * (null for a passkey).
   */
  wallet: ConnectedWallet | null;
  select: (source: TransferSource) => void;
};

const PRIMARY: TransferSource = { kind: 'primary' };

const storageKey = (accountId: string) => `transferSource:${accountId}`;

const restore = (accountId: string): TransferSource | null => {
  try {
    const stored = sessionStorage.getItem(storageKey(accountId));

    return stored ? (JSON.parse(stored) as TransferSource) : null;
  } catch {
    return null;
  }
};

const TransferSourceContext = createContext<Selection | null>(null);

/**
 * The active account's spending source, shared by Home's wallet tab and the
 * Swap and Send screens. Per account, restored when the panel reopens.
 */
export const TransferSourceProvider = ({ children }: PropsWithChildren) => {
  const { active, secondaries } = useAccounts();
  const [choices, setChoices] = useState<Record<string, TransferSource>>({});

  const value = useMemo<Selection>(() => {
    const chosen =
      (active ? (choices[active.id] ?? restore(active.id)) : null) ?? PRIMARY;

    const secondary =
      chosen.kind === 'secondary'
        ? (secondaries.find((wallet) => wallet.id === chosen.id) ?? null)
        : null;

    return {
      // A removed secondary (or anything stored before) means the primary.
      source: secondary ? chosen : PRIMARY,
      secondary,
      wallet: secondary ?? (active?.kind === 'wallet' ? active : null),
      select: (source) => {
        if (!active) {
          return;
        }

        setChoices((current) => ({ ...current, [active.id]: source }));

        try {
          sessionStorage.setItem(storageKey(active.id), JSON.stringify(source));
        } catch {
          // Session storage is a convenience only.
        }
      },
    };
  }, [active, secondaries, choices]);

  return (
    <TransferSourceContext.Provider value={value}>
      {children}
    </TransferSourceContext.Provider>
  );
};

export const useTransferSource = () => {
  const selection = useContext(TransferSourceContext);

  if (!selection) {
    throw new Error(
      'useTransferSource must be used inside TransferSourceProvider',
    );
  }

  return selection;
};

/** A stable key for a source, to notice it changing. */
export const sourceKey = (source: TransferSource) =>
  source.kind === 'secondary' ? `secondary:${source.id}` : 'primary';
