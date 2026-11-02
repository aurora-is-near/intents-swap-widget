import { useMemo } from 'react';

import { logger } from '@/logger';
import { getIntentsAccountId } from '@/utils/intents/getIntentsAccountId';
import { isNearAddress } from '@/utils/chains/isNearAddress';
import { useConfig } from '../config';
import { useUnsafeSnapshot } from '../machine';
import { useIntentsAccountType } from './useIntentsAccountType';

/** Hex (EVM, Solana, passkey) or named NEAR account: the IDs intents.near holds. */
const isIntentsAccountId = (id: string) =>
  /^(0x[0-9a-f]{40}|[0-9a-f]{64})$/i.test(id) || isNearAddress(id);

/**
 * The intents account the widget acts for: `config.intentsAccountId` when
 * set (a wallet funding another account), else the one derived from the
 * connected wallet address.
 */
export const useIntentsAccountId = () => {
  const {
    ctx: { walletAddress },
  } = useUnsafeSnapshot();

  const { intentsAccountId: configuredAccountId } = useConfig();
  const { intentsAccountType } = useIntentsAccountType();

  return useMemo(() => {
    if (configuredAccountId) {
      if (isIntentsAccountId(configuredAccountId)) {
        return configuredAccountId;
      }

      logger.error('[WIDGET] Malformed intentsAccountId in config, ignored');
    }

    return getIntentsAccountId({
      walletAddress,
      addressType: intentsAccountType,
    });
  }, [configuredAccountId, walletAddress, intentsAccountType]);
};
