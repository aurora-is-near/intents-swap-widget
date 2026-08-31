import { useMemo } from 'react';
import type {
  NearWalletBase,
  Providers,
} from '@aurora-is-near/intents-connect';

import type { NearTransferWallet } from '@/near/types';

import { CONNECTOR_IDS } from '@/connect/ids';
import type { ChainWalletConnector } from '@/connect/types';
import { useNearWallet } from '@/connect/near/useNearWallet';

/** NEAR as a `ChainWalletConnector`, plus the wallet object transfers need. */
export type NearConnectorState = ChainWalletConnector & {
  /** Pass to `./near`'s `makeTransfer` as `pluginOptions.wallet`. */
  wallet: NearTransferWallet | undefined;
};

export const useNearConnector = (): NearConnectorState => {
  const near = useNearWallet();

  return useMemo(
    () => ({
      id: CONNECTOR_IDS.near,
      isConnected: near.isConnected,
      address: near.accountId,
      connect: near.connect,
      disconnect: near.disconnect,
      signingStandard: near.isConnected ? ('nep413' as const) : undefined,
      getPublicKey: () => near.publicKey,
      getProviders: (): Providers =>
        near.nearWalletBase
          ? { near: () => near.nearWalletBase as unknown as NearWalletBase }
          : {},
      wallet: near.nearWalletBase as NearTransferWallet | undefined,
    }),
    [near],
  );
};
