import type { IntentsConnectWalletFamily } from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import type { WalletAddresses } from '@aurora-is-near/intents-swap-widget';

/**
 * Family-aware, so the balance loaders never query an EVM address on Solana or
 * vice versa. `default` covers every EVM chain; `sol` is chain-keyed.
 */
export const walletFamilyMap = (
  family: IntentsConnectWalletFamily | null,
  address?: string,
): WalletAddresses => {
  if (family === 'evm') {
    return { default: address };
  }

  if (family === 'sol') {
    return { sol: address };
  }

  return {};
};
