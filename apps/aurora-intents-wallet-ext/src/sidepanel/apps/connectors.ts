import { EVM_CHAINS } from '@aurora-is-near/intents-connect';
import type {
  MakeTransferArgs,
  WalletConnector,
} from '@aurora-is-near/intents-connect';
import { makeTransfer as evmTransfer } from '@aurora-is-near/intents-connect-wallet/evm';
import { makeTransfer as nearTransfer } from '@aurora-is-near/intents-connect-wallet/near';
import { makeTransfer as solTransfer } from '@aurora-is-near/intents-connect-wallet/solana';

import type { ConnectedWallet, WalletAccount } from '../accounts/types';
import { SOLANA_RPC_URL } from '../config';
import { ensureConnectorTab } from '../wallet/connectorWindow';
import { createNearPageProvider } from '../wallet/createNearPageProvider';
import { createPageProvider } from '../wallet/createPageProvider';
import { createSolanaPageProvider } from '../wallet/createSolanaPageProvider';
import { createWalletConnectProvider } from '../wallet/walletConnect';
import {
  guardEvmProvider,
  guardSolanaProvider,
} from '../wallet/withAccountGuard';

// Connecting happens when the account is added, never from the runner.
const noop = () => Promise.resolve();

const createEvmConnector = (account: WalletAccount): WalletConnector => {
  const provider =
    account.source === 'walletconnect'
      ? createWalletConnectProvider()
      : createPageProvider(ensureConnectorTab, account.bridgeId);

  return {
    id: account.id,
    name: account.name,
    chains: [...EVM_CHAINS],
    signingStandard: 'erc191',
    connect: noop,
    disconnect: noop,
    getAddress: () => account.address,
    getProviders: () => ({ evm: provider }),
    // Switches the wallet to the origin chain itself right before sending.
    makeTransfer: (args) => evmTransfer(args, { provider }),
    // No `getChainId` on purpose: it arms the runner's pre-sign network guard,
    // which would fail a deposit `makeTransfer` is about to fix by switching,
    // and block deposit-address payments, where the wallet never sends.
  };
};

const createSolanaConnector = (account: WalletAccount): WalletConnector => {
  const provider = createSolanaPageProvider(
    ensureConnectorTab,
    account.bridgeId,
    account.address,
  );

  return {
    id: account.id,
    name: account.name,
    chains: ['sol'],
    signingStandard: 'raw_ed25519',
    connect: noop,
    disconnect: noop,
    getAddress: () => account.address,
    // A Solana address is its ed25519 public key.
    getPublicKey: () => `ed25519:${account.address}`,
    getProviders: () => ({ sol: provider }),
    makeTransfer: (args) =>
      solTransfer(args, { provider, rpcUrl: SOLANA_RPC_URL }),
  };
};

const createNearConnector = (account: WalletAccount): WalletConnector => {
  // One object signs NEP-413 messages and sends the deposit transaction.
  const near = createNearPageProvider(ensureConnectorTab, account.bridgeId);

  return {
    id: account.id,
    name: account.name,
    chains: ['near'],
    signingStandard: 'nep413',
    connect: noop,
    disconnect: noop,
    getAddress: () => account.address,
    // NEAR accounts are resolved by account and key.
    getPublicKey: () => account.publicKey,
    getProviders: () => ({ near: () => near }),
    // `accountId` pins the signer: the wallet may hold several accounts.
    makeTransfer: (args) =>
      nearTransfer(args, { wallet: near, accountId: account.address }),
  };
};

type Transfer = NonNullable<WalletConnector['makeTransfer']>;

/**
 * A deposit transfer sent from another of the account's wallets (a secondary
 * one): it only sends, never signs the execution. Its providers check the
 * wallet is still on the connected account before sending.
 */
export const createWalletTransfer = (wallet: ConnectedWallet): Transfer => {
  switch (wallet.family) {
    case 'sol': {
      const provider = guardSolanaProvider(
        createSolanaPageProvider(
          ensureConnectorTab,
          wallet.bridgeId,
          wallet.address,
        ),
        ensureConnectorTab,
        wallet,
      );

      return (args) => solTransfer(args, { provider, rpcUrl: SOLANA_RPC_URL });
    }

    case 'near': {
      const near = createNearPageProvider(ensureConnectorTab, wallet.bridgeId);

      return (args) =>
        nearTransfer(args, { wallet: near, accountId: wallet.address });
    }

    default: {
      const provider = guardEvmProvider(
        createPageProvider(ensureConnectorTab, wallet.bridgeId),
        wallet,
      );

      return (args) => evmTransfer(args, { provider });
    }
  }
};

/** Who sends the next deposit, when not the account's own wallet. */
export type PayerRef = { current: Transfer | null };

/**
 * The Intents Connect connector for a wallet account: it signs executions
 * and sends their deposits — or hands the transfer to `payer` (another of
 * the account's wallets) when one is set. Browser wallets answer through the
 * connector page, mobile ones over WalletConnect.
 */
export const createConnector = (
  account: WalletAccount,
  payer: PayerRef,
): WalletConnector => {
  const connector = (() => {
    switch (account.family) {
      case 'sol':
        return createSolanaConnector(account);
      case 'near':
        return createNearConnector(account);
      default:
        return createEvmConnector(account);
    }
  })();

  const own = connector.makeTransfer;

  return {
    ...connector,
    makeTransfer: (args: MakeTransferArgs) => {
      const transfer = payer.current ?? own;

      if (!transfer) {
        throw new Error(`${account.name} can't send this deposit`);
      }

      return transfer(args);
    },
  };
};

/**
 * Why Intents Connect can't serve this account yet, if it can't: it resolves
 * NEAR accounts by their key, and implicit (64-hex) accounts only.
 */
export const unsupportedReason = (account: WalletAccount) => {
  if (account.family !== 'near') {
    return null;
  }

  if (!account.publicKey) {
    return `${account.name} was connected without its key. Remove it and connect it again to use apps.`;
  }

  return /^[0-9a-f]{64}$/.test(account.address)
    ? null
    : `Apps can't use named NEAR accounts like ${account.address} yet. Implicit (64-character) NEAR accounts work.`;
};
