import type { Chains } from '@aurora-is-near/intents-swap-widget';
import { isEvmChain } from '@aurora-is-near/intents-swap-widget/utils';

import type { Account } from '../../accounts/types';

/** The account's own address on `chain`, for a wallet of the same family. */
export const ownAddress = (account: Account, chain: Chains) => {
  if (account.kind !== 'wallet') {
    return undefined;
  }

  const matches =
    account.family === 'evm' ? isEvmChain(chain) : account.family === chain;

  return matches ? account.address : undefined;
};
