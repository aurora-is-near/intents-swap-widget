import type { ChainsFilters } from '@/types';

type Args = {
  customChainsFilter: ChainsFilters | undefined;
  enableAccountAbstraction: boolean;
  hasWallet: boolean;
  isQrSwap: boolean;
};

export const getSwapChainsFilters = ({
  customChainsFilter,
  enableAccountAbstraction,
  hasWallet,
  isQrSwap,
}: Args): ChainsFilters => {
  const enabledIntentsFilter = hasWallet ? 'with-balance' : 'all';
  const filters = customChainsFilter ?? {
    source: {
      intents: enableAccountAbstraction ? enabledIntentsFilter : 'none',
      external: hasWallet && !isQrSwap ? 'wallet-supported' : 'all',
    },
    target: {
      intents: enableAccountAbstraction ? 'all' : 'none',
      external: 'all',
    },
  };

  if (!isQrSwap) {
    return filters;
  }

  // QR swaps are funded by an unknown external wallet. Near Intents assets do
  // not have an external wallet/deposit path, on either side of the swap.
  return {
    source: { ...filters.source, intents: 'none' },
    target: { ...filters.target, intents: 'none' },
  };
};
