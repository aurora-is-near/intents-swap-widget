/**
 * Headless WalletConnect for EVM mobile wallets: pair by QR (you render the
 * URI), restore the session on reload, and run Intents Connect executions
 * over it. Needs the optional peer `@walletconnect/universal-provider`.
 */
export {
  createWalletConnectClient,
  PAIRING_TTL_MS,
  toWalletConnectConnector,
  type WalletConnectClient,
  type WalletConnectClientOptions,
  type WalletConnectMetadata,
  type WalletConnectPeer,
} from '@/connect/walletconnect/client';
export { AURORA_WALLETCONNECT_PROJECT_ID } from '@/connect/projectId';
