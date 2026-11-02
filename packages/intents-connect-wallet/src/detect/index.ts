/**
 * Detects wallets injected into the page and the accounts they already share
 * with the site — EVM (EIP-6963), Solana (Wallet Standard) and NEAR
 * (near-connect injected wallets) — without prompting. No chain SDK, no React.
 *
 * Turn a detected wallet into a `WalletConnector` with the adapter of its
 * chain subpath: `toEvmWalletConnector` (`./evm`), `toSolanaWalletConnector`
 * (`./solana`), `toNearWalletConnector` (`./near`). React: `./detect/react`.
 */
export { createWalletDetector, pickConnectedWallet } from '@/detect/detector';
export { isSolanaWallet, SOLANA_MAINNET } from '@/detect/solana';
export { NEAR_NETWORK } from '@/detect/near';
export type {
  DetectedEvmWallet,
  DetectedFamily,
  DetectedNearWallet,
  DetectedSolanaWallet,
  DetectedWallet,
  Eip1193Like,
  InjectedNearWallet,
  NearInjectedAccount,
  StandardWalletAccount,
  StandardWalletLike,
  UnsupportedReason,
  WalletDetector,
  WalletDetectorOptions,
  WalletDetectorSnapshot,
} from '@/detect/types';
