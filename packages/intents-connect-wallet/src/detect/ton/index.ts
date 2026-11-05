/**
 * TON wallet extensions for the detector, over a TON Connect client from
 * `./ton`: `createWalletDetector({ sources: [tonWallets(client)] })`.
 */
export { tonWallets } from '@/detect/ton/source';
export type { DetectedTonWallet } from '@/detect/types';
