import { EVM_CHAINS } from '@aurora-is-near/intents-connect';
import type { WalletConnector } from '@aurora-is-near/intents-connect';
import { makeTransfer as evmTransfer } from '@aurora-is-near/intents-connect-wallet/evm';
import { makeTransfer as nearTransfer } from '@aurora-is-near/intents-connect-wallet/near';
import { makeTransfer as solTransfer } from '@aurora-is-near/intents-connect-wallet/solana';

import { SOLANA_RPC_URL } from '../config';
import { createPageProvider } from './createPageProvider';
import type { TabResolver } from './createPageProvider';
import { createNearPageProvider } from './createNearPageProvider';
import { createSolanaPageProvider } from './createSolanaPageProvider';
import type { ConnectedWallet } from './types';

const createEvmConnector = (
  getTabId: TabResolver,
  wallet: ConnectedWallet,
): WalletConnector => {
  const provider = createPageProvider(getTabId, wallet.bridgeId);

  return {
    id: `${wallet.connection}-${wallet.id}`,
    name: wallet.info.name,
    chains: [...EVM_CHAINS],
    signingStandard: 'erc191',
    // Connecting happens in the panel (or on the site), never from the runner.
    connect: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    getAddress: () => wallet.address,
    getProviders: () => ({ evm: provider }),
    // Switches the wallet to the origin chain itself (adding it if the wallet
    // doesn't know it) right before sending, like the widget does.
    makeTransfer: (args) => evmTransfer(args, { provider }),
    // No `getChainId` on purpose: it enables the runner's pre-sign network
    // guard, which would fail a deposit that `makeTransfer` is about to fix by
    // switching — and would block QR deposits, where the wallet never sends.
  };
};

const createSolanaConnector = (
  getTabId: TabResolver,
  wallet: ConnectedWallet,
): WalletConnector => {
  const provider = createSolanaPageProvider(
    getTabId,
    wallet.bridgeId,
    wallet.address,
  );

  return {
    id: `${wallet.connection}-${wallet.id}`,
    name: wallet.info.name,
    chains: ['sol'],
    signingStandard: 'raw_ed25519',
    connect: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    getAddress: () => wallet.address,
    // A Solana address IS its ed25519 public key.
    getPublicKey: () => `ed25519:${wallet.address}`,
    getProviders: () => ({ sol: provider }),
    makeTransfer: (args) =>
      solTransfer(args, { provider, rpcUrl: SOLANA_RPC_URL }),
  };
};

const createNearConnector = (
  getTabId: TabResolver,
  wallet: ConnectedWallet,
): WalletConnector => {
  const { signer, transfers } = createNearPageProvider(
    getTabId,
    wallet.bridgeId,
  );

  return {
    id: `${wallet.connection}-${wallet.id}`,
    name: wallet.info.name,
    chains: ['near'],
    signingStandard: 'nep413',
    connect: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    getAddress: () => wallet.address,
    // NEAR accounts are resolved by account + key.
    getPublicKey: () => wallet.publicKey,
    getProviders: () => ({ near: () => signer }),
    // `accountId` pins the signer: the wallet may hold several accounts.
    makeTransfer: (args) =>
      nearTransfer(args, { wallet: transfers, accountId: wallet.address }),
  };
};

/**
 * The Intents Connect connector for a usable wallet. Its requests go to the
 * page it is connected on: the site's tab, or the extension's connector.
 */
export const createConnector = (
  getTabId: TabResolver,
  wallet: ConnectedWallet,
) => {
  switch (wallet.family) {
    case 'sol':
      return createSolanaConnector(getTabId, wallet);
    case 'near':
      return createNearConnector(getTabId, wallet);
    default:
      return createEvmConnector(getTabId, wallet);
  }
};
