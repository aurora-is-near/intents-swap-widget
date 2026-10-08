import type {
  IntentsAccountType,
  Providers,
  WidgetConfig,
} from '@aurora-is-near/intents-swap-widget';

import { ALCHEMY_API_KEY, API_KEY } from '../config';
import { createWebAuthnProvider } from '../passkey/webauthn';
import { ensureConnectorTab } from '../wallet/connectorWindow';
import { createNearPageProvider } from '../wallet/createNearPageProvider';
import { createPageProvider } from '../wallet/createPageProvider';
import { createSolanaPageProvider } from '../wallet/createSolanaPageProvider';
import { createWalletConnectProvider } from '../wallet/walletConnect';
import type { Account, WalletAccount } from './types';

const ACCOUNT_TYPES: Record<WalletAccount['family'], IntentsAccountType> = {
  evm: 'evm',
  sol: 'sol',
  near: 'near',
};

/**
 * Browser wallet requests are served by the connector page, opened on demand;
 * a mobile wallet's go over its WalletConnect session.
 */
const walletProviders = (account: WalletAccount): Providers => {
  if (account.source === 'walletconnect') {
    return { evm: createWalletConnectProvider() };
  }

  switch (account.family) {
    case 'evm':
      return { evm: createPageProvider(ensureConnectorTab, account.bridgeId) };
    case 'sol':
      return {
        sol: createSolanaPageProvider(
          ensureConnectorTab,
          account.bridgeId,
          account.address,
        ),
      };

    case 'near': {
      const near = createNearPageProvider(ensureConnectorTab, account.bridgeId);

      return { near: () => near };
    }
    default:
      return {};
  }
};

/**
 * Widget config for the active account. A passkey account only holds intents
 * balances: no wallet chains, so no on-chain balance loading, and refunds and
 * swaps stay on NEAR Intents.
 */
export const buildWidgetConfig = (
  account: Account | null,
): Partial<WidgetConfig> => {
  if (!account) {
    return { apiKey: API_KEY, connectedWallets: {} };
  }

  if (account.kind === 'passkey') {
    return {
      apiKey: API_KEY,
      enableAccountAbstraction: true,
      intentsAccountType: 'webauthn',
      connectedWallets: { default: account.intentsAccountId },
      providers: { webauthn: createWebAuthnProvider(account) },
    };
  }

  return {
    apiKey: API_KEY,
    enableAccountAbstraction: true,
    intentsAccountType: ACCOUNT_TYPES[account.family],
    connectedWallets: { default: account.address },
    // Wallet balances: Alchemy for EVM and Solana, RPC for NEAR (App).
    alchemyApiKey: ALCHEMY_API_KEY,
    providers: walletProviders(account),
  };
};
