import { useMemo } from 'react';
import type { Providers } from '@aurora-is-near/intents-connect';

import { decodePublicKey } from '@/stellar/decodePublicKey';
import { CONNECTOR_IDS } from '@/connect/ids';
import type { ChainWalletConnector } from '@/connect/types';
import { useStellarWallet } from '@/connect/stellar/useStellarWallet';

export type StellarConnectorState = ChainWalletConnector & {
  /**
   * StrKey `G…` → 32 raw bytes, ready to hand to `intents-connect`'s `sep53`
   * signer. `undefined` while disconnected.
   *
   * Sourced from this package's `./stellar` subpath, which makes
   * `@stellar/stellar-sdk` a REQUIRED peer of `./connect/stellar` too — the
   * wallets kit depends on `@stellar/stellar-base`, not the SDK, so it does
   * not bring the SDK along.
   */
  decodePublicKey: (() => Uint8Array) | undefined;
};

export const useStellarConnector = (): StellarConnectorState => {
  const stellar = useStellarWallet();

  return useMemo(() => {
    const provider = stellar.walletAddress
      ? {
          publicKey: stellar.walletAddress,
          signMessage: stellar.signMessage,
          signTransaction: stellar.signTransaction,
        }
      : undefined;

    return {
      id: CONNECTOR_IDS.stellar,
      isConnected: stellar.isConnected,
      address: stellar.walletAddress ?? undefined,
      connect: stellar.connect,
      disconnect: stellar.disconnect,
      signingStandard: stellar.isConnected ? ('sep53' as const) : undefined,
      getPublicKey: () => stellar.walletAddress ?? undefined,
      getProviders: (): Providers => (provider ? { stellar: provider } : {}),
      decodePublicKey: provider ? () => decodePublicKey(provider) : undefined,
    };
  }, [stellar]);
};
