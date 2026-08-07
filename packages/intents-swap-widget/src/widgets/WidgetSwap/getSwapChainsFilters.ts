import type { ChainsFilters } from '@/types';

type Args = {
  customChainsFilter: ChainsFilters | undefined;
  restrictToExternalAssets: boolean;
  enableAccountAbstraction: boolean;
  hasWallet: boolean;
};

export const getSwapChainsFilters = ({
  customChainsFilter,
  restrictToExternalAssets,
  enableAccountAbstraction,
  hasWallet,
}: Args): ChainsFilters => {
  const enabledIntentsFilter = hasWallet ? 'with-balance' : 'all';
  const filters = customChainsFilter ?? {
    source: {
      intents: enableAccountAbstraction ? enabledIntentsFilter : 'none',
      external:
        hasWallet && !restrictToExternalAssets ? 'wallet-supported' : 'all',
    },
    target: {
      intents: enableAccountAbstraction ? 'all' : 'none',
      external: 'all',
    },
  };

  if (!restrictToExternalAssets) {
    return filters;
  }

  // QR swaps are funded by an unknown external wallet. Near Intents assets do
  // not have an external wallet/deposit path, on either side of the swap.
  return {
    source: { ...filters.source, intents: 'none' },
    target: { ...filters.target, intents: 'none' },
  };
};

type RestrictionArgs = {
  allowSwapWithExternalWallet: boolean;
  hasWallet: boolean;
  isDepositFromExternalWallet: boolean;
};

export const shouldRestrictSwapToExternalAssets = ({
  allowSwapWithExternalWallet,
  hasWallet,
  isDepositFromExternalWallet,
}: RestrictionArgs): boolean =>
  isDepositFromExternalWallet || (allowSwapWithExternalWallet && !hasWallet);
