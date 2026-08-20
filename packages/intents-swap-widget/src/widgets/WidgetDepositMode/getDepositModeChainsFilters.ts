import type { ChainsFilters } from '@/types';

type Args = {
  customChainsFilter: ChainsFilters | undefined;
  hasWallet: boolean;
  isDepositFromExternalWallet: boolean;
};

export const getDepositModeChainsFilters = ({
  customChainsFilter,
  hasWallet,
  isDepositFromExternalWallet,
}: Args): ChainsFilters => {
  const restrictSourceIntents = isDepositFromExternalWallet || !hasWallet;
  const filters = customChainsFilter ?? {
    source: {
      intents: 'none',
      external: restrictSourceIntents ? 'all' : 'wallet-supported',
    },
    target: { intents: 'all', external: 'none' },
  };

  if (!restrictSourceIntents) {
    return filters;
  }

  return {
    ...filters,
    source: { ...filters.source, intents: 'none' },
  };
};
