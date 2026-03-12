import { useMemo } from 'react';
import { useUnsafeSnapshot } from '../machine';
import { isEvmAddress } from '../utils/chains/isEvmAddress';
import { isNearAddress } from '../utils/chains/isNearAddress';
import { isSolanaAddress } from '../utils/chains/isSolanaAddress';
import { isStellarAddress } from '../utils/chains/isStellarAddress';

const getIntentsAccountTypeFromAddress = (
  address: string,
): 'sol' | 'evm' | 'near' | 'stellar' | undefined => {
  if (isSolanaAddress(address)) {
    return 'sol';
  }

  if (isEvmAddress(address)) {
    return 'evm';
  }

  if (isNearAddress(address)) {
    return 'near';
  }

  if (isStellarAddress(address)) {
    return 'stellar';
  }

  return undefined;
};

/**
 * Determines the intents account type based on the active wallet addresses.
 *
 * If an intents account type is already specified in the configuration, it
 * takes precedence. Otherwise, the function infers the account type from the
 * wallet address format.
 */
export const useIntentsAccountType = () => {
  const {
    ctx: { walletAddress },
  } = useUnsafeSnapshot();

  const intentsAccountType = useMemo(() => {
    if (!walletAddress) {
      return;
    }

    return getIntentsAccountTypeFromAddress(walletAddress);
  }, [walletAddress]);

  return { intentsAccountType };
};
