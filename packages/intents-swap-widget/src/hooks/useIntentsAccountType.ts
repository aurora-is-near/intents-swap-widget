import { useMemo } from 'react';
import { useConfig } from '../config';
import { useUnsafeSnapshot } from '../machine';
import { getIntentsAccountTypeFromAddress } from '../utils/chains/getIntentsAccountTypeFromAddress';

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

  const { intentsAccountType: configuredAccountType } = useConfig();

  const intentsAccountType = useMemo(() => {
    if (!walletAddress) {
      return;
    }

    return (
      configuredAccountType ?? getIntentsAccountTypeFromAddress(walletAddress)
    );
  }, [walletAddress, configuredAccountType]);

  return { intentsAccountType };
};
