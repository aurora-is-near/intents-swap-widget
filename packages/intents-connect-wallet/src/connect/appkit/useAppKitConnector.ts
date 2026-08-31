import { useMemo } from 'react';
import type { Providers } from '@aurora-is-near/intents-connect';

import type { ChainWalletConnector } from '@/connect/types';
import { CONNECTOR_IDS } from '@/connect/ids';
import { useAppKitProviders } from '@/connect/appkit/useAppKitProviders';
import { useAppKitWallet } from '@/connect/appkit/useAppKitWallet';

/**
 * Reown AppKit as a single `ChainWalletConnector`.
 *
 * EVM and Solana are one connector because AppKit configures both namespaces in
 * a single instance — they cannot be connected or disconnected independently.
 */
export const useAppKitConnector = (): ChainWalletConnector => {
  const wallet = useAppKitWallet();
  const providers = useAppKitProviders();

  return useMemo(() => {
    // The connector spans two namespaces; which standard applies follows from
    // the ACTIVE connection, named by the CAIP address prefix.
    const isSolana = wallet.caipAddress?.startsWith('solana');
    const isEvm = wallet.caipAddress?.startsWith('eip155');
    const { evm } = providers;

    let signingStandard: 'raw_ed25519' | 'erc191' | undefined;

    if (isSolana) {
      signingStandard = 'raw_ed25519';
    } else if (isEvm) {
      signingStandard = 'erc191';
    }

    return {
      id: CONNECTOR_IDS.evmSolana,
      isConnected: wallet.isConnected,
      address: wallet.address,
      connect: wallet.connect,
      disconnect: wallet.disconnect,
      signingStandard,
      // A Solana address IS the base58 ed25519 public key.
      getPublicKey: () => (isSolana ? wallet.address : undefined),
      // Feeds the runner's NETWORK_MISMATCH guard for EVM origins. Normalizes
      // providers that answer eth_chainId with a decimal number.
      getChainId: evm
        ? async () => {
            const chainId = (await evm.request({
              method: 'eth_chainId',
            })) as string | number;

            return typeof chainId === 'number'
              ? chainId
              : Number.parseInt(chainId, 16);
          }
        : undefined,
      getProviders: (): Providers => ({
        evm: providers.evm,
        sol: providers.sol,
      }),
    };
  }, [wallet, providers]);
};
