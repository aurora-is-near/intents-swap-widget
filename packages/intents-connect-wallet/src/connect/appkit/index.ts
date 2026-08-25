/**
 * EVM + Solana connection via Reown AppKit.
 *
 * Optional peers: `@reown/appkit`, `@reown/appkit-adapter-ethers`,
 * `@reown/appkit-adapter-solana`, `@solana/wallet-adapter-phantom`,
 * `@solana/wallet-adapter-solflare`, `viem`.
 */
export {
  AppKitProvider,
  AppKitContext,
  DEFAULT_RPC_OVERRIDES,
  initAppKit,
  type AppKitConfig,
  type AppKitThemeMode,
} from '@/connect/appkit/appkit';
export { useAppKitWallet } from '@/connect/appkit/useAppKitWallet';
export { useAppKitProviders } from '@/connect/appkit/useAppKitProviders';
export { useAppKitConnector } from '@/connect/appkit/useAppKitConnector';
export {
  useIntentsConnectWallet,
  type IntentsConnectWalletFamily,
  type UseIntentsConnectWalletOptions,
} from '@/connect/appkit/useIntentsConnectWallet';
