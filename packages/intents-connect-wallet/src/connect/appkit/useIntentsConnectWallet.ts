'use client';

import { useMemo } from 'react';

import {
  EVM_CHAINS,
  type WalletConnector,
} from '@aurora-is-near/intents-connect';

import { makeTransfer as evmTransfer } from '@/evm/makeTransfer';
import { makeTransfer as solTransfer } from '@/solana/makeTransfer';
import { useAppKitProviders } from '@/connect/appkit/useAppKitProviders';
import { useAppKitWallet } from '@/connect/appkit/useAppKitWallet';

const DEFAULT_SOLANA_RPC_URL = 'https://solana-rpc.publicnode.com';

export type IntentsConnectWalletFamily = 'evm' | 'sol';

export type UseIntentsConnectWalletOptions = {
  /** Chains the EVM connector claims. Defaults to every EVM chain the engine routes. */
  evmChains?: readonly string[];
  /** RPC the Solana transfer builds and simulates transactions against. */
  solanaRpcUrl?: string;
};

/**
 * Reown AppKit account → engine `WalletConnector`, ready for
 * `IntentsConnectProvider` / `createExecutionRunner`.
 *
 * This is the whole bridge between the connect modal and the engine: it pairs
 * the active connection's family with the right signing standard (`erc191`
 * for EVM, `raw_ed25519` for Solana), exposes the matching provider, and
 * wires the family's deposit transfer. The family follows the ACTIVE
 * connection, named by the CAIP address prefix — never guessed from the
 * address shape.
 *
 * `wallet` is `null` while disconnected (or while the provider for the active
 * family has not surfaced yet); pass it straight to `IntentsConnectProvider`,
 * which treats `null` as "no wallet".
 */
export const useIntentsConnectWallet = (
  options?: UseIntentsConnectWalletOptions,
) => {
  const w = useAppKitWallet();
  const { evm, sol } = useAppKitProviders();

  const evmChains = options?.evmChains;
  const solanaRpcUrl = options?.solanaRpcUrl ?? DEFAULT_SOLANA_RPC_URL;

  let family: IntentsConnectWalletFamily | null = null;

  if (w.caipAddress?.startsWith('eip155')) {
    family = 'evm';
  } else if (w.caipAddress?.startsWith('solana')) {
    family = 'sol';
  }

  const wallet = useMemo<WalletConnector | null>(() => {
    if (!w.address) {
      return null;
    }

    const shared = {
      name: 'AppKit',
      connect: () => Promise.resolve(w.connect()),
      disconnect: () => Promise.resolve(w.disconnect()),
      getAddress: () => w.address,
    };

    if (family === 'evm' && evm) {
      return {
        ...shared,
        id: 'appkit-evm',
        chains: evmChains ?? [...EVM_CHAINS],
        signingStandard: 'erc191',
        getProviders: () => ({ evm }),
        makeTransfer: (args) => evmTransfer(args, { provider: evm }),
      };
    }

    if (family === 'sol' && sol) {
      return {
        ...shared,
        id: 'appkit-sol',
        chains: ['sol'],
        signingStandard: 'raw_ed25519',
        // A Solana address IS its ed25519 public key.
        getPublicKey: () => `ed25519:${w.address}`,
        getProviders: () => ({ sol }),
        makeTransfer: (args) =>
          solTransfer(args, { provider: sol, rpcUrl: solanaRpcUrl }),
      };
    }

    return null;
  }, [w, family, evm, sol, evmChains, solanaRpcUrl]);

  return { ...w, family, wallet };
};
