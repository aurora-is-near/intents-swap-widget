/**
 * Detects wallets injected into the page and the accounts they already share
 * with the site — EVM (EIP-6963), Solana (Wallet Standard) and NEAR
 * (near-connect injected wallets) — without prompting. No chain SDK, no React.
 * `connectDetectedWallet` is the only call that prompts; the wallets it
 * connects are remembered and restored silently afterwards.
 *
 * Turn a detected wallet into a `WalletConnector` with the adapter of its
 * chain subpath: `toEvmWalletConnector` (`./evm`), `toSolanaWalletConnector`
 * (`./solana`), `toNearWalletConnector` (`./near`). React: `./detect/react`.
 */
export {
  connectDetectedWallet,
  disconnectDetectedWallet,
} from '@/detect/connect';
export { createWalletDetector, pickConnectedWallet } from '@/detect/detector';
export { isPluggableWallet } from '@/detect/pluggable';
export {
  forgetWalletConnection,
  getRememberedAddress,
  getRememberedConnection,
  REMEMBERED_ADDRESSES_STORAGE_KEY,
  REMEMBERED_WALLETS_STORAGE_KEY,
  rememberWalletAddress,
  rememberWalletConnection,
  type RememberedConnection,
} from '@/detect/remembered';
export { isSolanaWallet, SOLANA_MAINNET } from '@/detect/solana';
export { NEAR_NETWORK } from '@/detect/near';
export type {
  DetectedEvmWallet,
  DetectedFamily,
  DetectedNearWallet,
  DetectedSolanaWallet,
  DetectedStellarWallet,
  DetectedWallet,
  Eip1193Like,
  InjectedNearWallet,
  NearInjectedAccount,
  PluggableWallet,
  StandardWalletAccount,
  StandardWalletLike,
  UnsupportedReason,
  WalletDetector,
  WalletDetectorOptions,
  WalletDetectorSnapshot,
  WalletSource,
  WalletSourceHandle,
} from '@/detect/types';
