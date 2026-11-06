import type { DetectedWallet } from '@aurora-is-near/intents-connect-wallet/detect';

import type { TransferFamily } from './origins';

/** Who signs a transfer from one chain family. */
export type TransferSigner =
  /** The active wallet signs, as it is. */
  | { kind: 'active' }
  /** A wallet that shares an account with the page: picked with no prompt. */
  | { kind: 'ready'; wallet: DetectedWallet }
  /** The family's wallets, none sharing an account: picking one connects it. */
  | { kind: 'choose'; wallets: readonly DetectedWallet[] }
  /** No wallet of the family in this browser. */
  | { kind: 'none' };

export const FAMILY_NAME: Record<TransferFamily, string> = {
  evm: 'EVM',
  sol: 'Solana',
  tron: 'TRON',
  near: 'NEAR',
};

/**
 * The wallet that signs a transfer paid from `family`: the signer must be
 * on the origin's chain family, since the service refunds to its address
 * there. EVM networks sign with the dApp's own wallet first. Otherwise the
 * active wallet when it is of the family, else one that already shares an
 * account, else a choice among the family's wallets.
 */
export const transferSigner = (
  family: TransferFamily,
  {
    wallets,
    active,
    dappAccount,
  }: {
    wallets: readonly DetectedWallet[];
    active: { family: string; address: string } | null;
    /** The dApp's own account (EVM). */
    dappAccount?: string | null;
  },
): TransferSigner => {
  const own = wallets.filter((wallet) => wallet.family === family);
  const same = (a?: string | null, b?: string | null) =>
    !!a && !!b && a.toLowerCase() === b.toLowerCase();

  if (family === 'evm' && dappAccount) {
    const dappWallet = own.find((wallet) => same(wallet.address, dappAccount));

    if (dappWallet) {
      return active?.family === 'evm' && same(active.address, dappAccount)
        ? { kind: 'active' }
        : { kind: 'ready', wallet: dappWallet };
    }
  }

  if (active?.family === family) {
    return { kind: 'active' };
  }

  const sharing = own.find((wallet) => !!wallet.address);

  if (sharing) {
    return { kind: 'ready', wallet: sharing };
  }

  return own.length ? { kind: 'choose', wallets: own } : { kind: 'none' };
};
