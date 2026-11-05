/**
 * Stellar browser wallets (Freighter, xBull, LOBSTR, Hana) for the detector:
 * `createWalletDetector({ sources: [stellarWallets()] })`. Needs the
 * optional peers `@creit.tech/stellar-wallets-kit` and `@stellar/stellar-sdk`.
 */
export { stellarWallets, type StellarModule } from '@/detect/stellar/source';
export { isSep53Signature, moduleProvider } from '@/detect/stellar/provider';
export type { DetectedStellarWallet } from '@/detect/types';
