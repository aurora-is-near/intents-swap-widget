import type { Chains } from '@aurora-is-near/intents-swap-widget';

/**
 * The `allowedChainsList` to save for the selected networks. When every network
 * the API key can use is selected, nothing is saved, so the widget allows all
 * chains — including ones added after the config was saved. Saving the full
 * list instead would freeze it, and new chains would stay hidden.
 */
export const getAllowedChainsList = (
  selectedNetworks: readonly Chains[],
  availableNetworks: readonly Chains[],
): Chains[] | undefined => {
  const allSelected = availableNetworks.every((network) =>
    selectedNetworks.includes(network),
  );

  return allSelected ? undefined : [...selectedNetworks];
};
