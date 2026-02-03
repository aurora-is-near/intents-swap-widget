import { useMemo } from 'react';
import { useUnsafeSnapshot } from '../machine';
import { isEvmAddress } from '../utils/chains/isEvmAddress';
import { isNearAddress } from '../utils/chains/isNearAddress';
import { isSolanaAddress } from '../utils/chains/isSolanaAddress';

const getIntentsAccountTypeFromAddress = (
  address: string,
): 'sol' | 'evm' | 'near' | undefined => {
  if (isSolanaAddress(address)) {
    return 'sol';
  }

  if (isEvmAddress(address)) {
    return 'evm';
  }

  if (isNearAddress(address)) {
    return 'near';
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
