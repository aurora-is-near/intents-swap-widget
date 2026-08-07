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

  // Near Intents assets require a connected wallet. Walletless quotes and QR
  // swaps can only use assets with an external wallet/deposit path.
  return {
    source: { ...filters.source, intents: 'none' },
    target: { ...filters.target, intents: 'none' },
  };
};

type RestrictionArgs = {
  hasWallet: boolean;
  isDepositFromExternalWallet: boolean;
};

export const shouldRestrictSwapToExternalAssets = ({
  hasWallet,
  isDepositFromExternalWallet,
}: RestrictionArgs): boolean => isDepositFromExternalWallet || !hasWallet;
