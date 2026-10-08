import type { Chains } from '@aurora-is-near/intents-swap-widget';
import { isEvmChain } from '@aurora-is-near/intents-swap-widget/utils';

import type { ConnectedWallet } from '../../accounts/types';

type WalletLike = Pick<ConnectedWallet, 'family' | 'address'>;

/** The wallet's own address on `chain`, when it is of the chain's family. */
export const ownAddress = (
  wallet: WalletLike | null | undefined,
  chain: Chains,
) => {
  if (!wallet) {
    return undefined;
  }

  const matches =
    wallet.family === 'evm' ? isEvmChain(chain) : wallet.family === chain;

  return matches ? wallet.address : undefined;
};

export const sameAddress = (a: string | undefined, b: string | undefined) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();
