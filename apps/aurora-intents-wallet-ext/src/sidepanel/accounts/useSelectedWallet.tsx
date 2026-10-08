import { createContext, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import type { SecondaryWallet } from './types';
import { useAccounts } from './useAccounts';

/** The account's own wallet (or passkey), or one of its secondary wallets. */
export type WalletRef = { kind: 'primary' } | { kind: 'secondary'; id: string };

type SelectedWallet = {
  selected: WalletRef;
  /** The selected secondary wallet; null when the primary is selected. */
  secondary: SecondaryWallet | null;
  select: (ref: WalletRef) => void;
};

const PRIMARY: WalletRef = { kind: 'primary' };

const storageKey = (accountId: string) => `selectedWallet:${accountId}`;

const restore = (accountId: string | undefined): WalletRef => {
  if (!accountId) {
    return PRIMARY;
  }

  try {
    const stored = sessionStorage.getItem(storageKey(accountId));

    return stored ? (JSON.parse(stored) as WalletRef) : PRIMARY;
  } catch {
    return PRIMARY;
  }
};

const SelectedWalletContext = createContext<SelectedWallet | null>(null);

/**
 * Which of the active account's wallets the widget is configured with: the
 * one whose on-chain balances show on Home and can be spent on Swap and
 * Send. Per account, restored when the panel reopens.
 */
export const SelectedWalletProvider = ({ children }: PropsWithChildren) => {
  const { active, secondaries } = useAccounts();
  const [choices, setChoices] = useState<Record<string, WalletRef>>({});

  const value = useMemo<SelectedWallet>(() => {
    const chosen = active
      ? (choices[active.id] ?? restore(active.id))
      : PRIMARY;

    const secondary =
      chosen.kind === 'secondary'
        ? (secondaries.find((wallet) => wallet.id === chosen.id) ?? null)
        : null;

    return {
      // A removed secondary falls back to the primary.
      selected: secondary ? chosen : PRIMARY,
      secondary,
      select: (ref) => {
        if (!active) {
          return;
        }

        setChoices((current) => ({ ...current, [active.id]: ref }));

        try {
          sessionStorage.setItem(storageKey(active.id), JSON.stringify(ref));
        } catch {
          // Session storage is a convenience only.
        }
      },
    };
  }, [active, secondaries, choices]);

  return (
    <SelectedWalletContext.Provider value={value}>
      {children}
    </SelectedWalletContext.Provider>
  );
};

export const useSelectedWallet = () => {
  const selected = useContext(SelectedWalletContext);

  if (!selected) {
    throw new Error(
      'useSelectedWallet must be used inside SelectedWalletProvider',
    );
  }

  return selected;
};
