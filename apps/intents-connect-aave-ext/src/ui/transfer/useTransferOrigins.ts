import { useSupportedTokens } from '@aurora-is-near/intents-connect/react';
import { useMemo } from 'react';

import { chainLabel } from '../assets/tokens';
import { transferOrigins } from './origins';

/**
 * What can be sent to a deposit address, from the service's own list, and
 * the network names it spans, most used first.
 */
export const useTransferOrigins = () => {
  const supported = useSupportedTokens();
  const origins = useMemo(
    () => transferOrigins(supported.origins),
    [supported.origins],
  );

  const networks = useMemo(
    () => [
      ...new Set(origins.map((origin) => chainLabel(origin.token.blockchain))),
    ],
    [origins],
  );

  return {
    origins,
    networks,
    status: supported.status,
    error: supported.error,
    refresh: supported.refresh,
  };
};
