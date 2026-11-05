import type { DetectedFamily } from '@aurora-is-near/intents-connect-wallet/detect';

/** Wallet families, in the order the wallet list shows them. */
export const FAMILY_LABEL: Record<DetectedFamily, string> = {
  evm: 'EVM',
  sol: 'Solana',
  near: 'NEAR',
};
