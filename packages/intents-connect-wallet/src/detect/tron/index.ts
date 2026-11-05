/**
 * TRON browser wallets (TronLink, and others announced over TIP-6963) for the
 * detector: `createWalletDetector({ sources: [tronWallets()] })`. No
 * dependencies: each wallet's own `tronWeb` does the work.
 */
export { tronWallets } from '@/detect/tron/source';
export type { DetectedTronWallet } from '@/detect/types';
