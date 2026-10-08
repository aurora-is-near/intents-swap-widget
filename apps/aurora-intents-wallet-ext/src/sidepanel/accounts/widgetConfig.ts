import type {
  IntentsAccountType,
  Providers,
  WidgetConfig,
} from '@aurora-is-near/intents-swap-widget';

import {
  ALCHEMY_API_KEY,
  FEE_SERVICE_API_KEY,
  WIDGET_INTENTS_API_URL,
} from '../config';
import { createWebAuthnProvider } from '../passkey/webauthn';
import { ensureConnectorTab } from '../wallet/connectorWindow';
import { createNearPageProvider } from '../wallet/createNearPageProvider';
import { createPageProvider } from '../wallet/createPageProvider';
import { createSolanaPageProvider } from '../wallet/createSolanaPageProvider';
import { createWalletConnectProvider } from '../wallet/walletConnect';
import {
  guardEvmProvider,
  guardSolanaProvider,
} from '../wallet/withAccountGuard';
import { getAccountIntentsId } from './intentsAccountId';
import type { Account, ConnectedWallet, SecondaryWallet } from './types';

const ACCOUNT_TYPES: Record<ConnectedWallet['family'], IntentsAccountType> = {
  evm: 'evm',
  sol: 'sol',
  near: 'near',
};

/**
 * Browser wallet requests are served by the connector page, opened on demand;
 * a mobile wallet's go over its WalletConnect session. A secondary wallet's
 * requests are checked against its account first: the bridge reaches the
 * wallet, which may have another account selected.
 */
const walletProviders = (
  wallet: ConnectedWallet,
  { isSecondary }: { isSecondary: boolean },
): Providers => {
  if (wallet.source === 'walletconnect') {
    return { evm: createWalletConnectProvider() };
  }

  switch (wallet.family) {
    case 'evm': {
      const evm = createPageProvider(ensureConnectorTab, wallet.bridgeId);

      return { evm: isSecondary ? guardEvmProvider(evm, wallet) : evm };
    }

    case 'sol': {
      const sol = createSolanaPageProvider(
        ensureConnectorTab,
        wallet.bridgeId,
        wallet.address,
      );

      return {
        sol: isSecondary
          ? guardSolanaProvider(sol, ensureConnectorTab, wallet)
          : sol,
      };
    }

    case 'near': {
      const near = createNearPageProvider(ensureConnectorTab, wallet.bridgeId);

      return { near: () => near };
    }
    default:
      return {};
  }
};

/**
 * Widget config for the active account, and the wallet it spends from:
 *
 * - its own wallet (or passkey): the widget's wallet is the account's. A
 *   passkey account only holds intents balances: no wallet chains, so no
 *   on-chain balance loading, and refunds and swaps stay on NEAR Intents.
 * - a secondary wallet: the widget's wallet is the secondary — its balances,
 *   its provider signs on-chain, refunds return to it — while the intents
 *   account stays the primary's (`intentsAccountId`), so a swap into intents
 *   lands in the account. It never signs intents: screens restrict its source
 *   to on-chain tokens.
 */
export const buildWidgetConfig = (
  account: Account | null,
  secondary: SecondaryWallet | null = null,
): Partial<WidgetConfig> => {
  const service = {
    apiKey: FEE_SERVICE_API_KEY,
    intentsApiUrl: WIDGET_INTENTS_API_URL,
    // Send's target may be its source token (same asset, same chain);
    // Swap flips the tokens itself instead.
    enableAutoTokensSwitching: false,
  };

  if (!account) {
    return { ...service, connectedWallets: {} };
  }

  if (secondary) {
    return {
      ...service,
      enableAccountAbstraction: true,
      intentsAccountType: ACCOUNT_TYPES[secondary.family],
      intentsAccountId: getAccountIntentsId(account),
      connectedWallets: { default: secondary.address },
      alchemyApiKey: ALCHEMY_API_KEY,
      providers: walletProviders(secondary, { isSecondary: true }),
    };
  }

  if (account.kind === 'passkey') {
    return {
      ...service,
      enableAccountAbstraction: true,
      intentsAccountType: 'webauthn',
      connectedWallets: { default: account.intentsAccountId },
      providers: { webauthn: createWebAuthnProvider(account) },
    };
  }

  return {
    ...service,
    enableAccountAbstraction: true,
    intentsAccountType: ACCOUNT_TYPES[account.family],
    connectedWallets: { default: account.address },
    // Wallet balances: Alchemy for EVM and Solana, RPC for NEAR (App).
    alchemyApiKey: ALCHEMY_API_KEY,
    providers: walletProviders(account, { isSecondary: false }),
  };
};
