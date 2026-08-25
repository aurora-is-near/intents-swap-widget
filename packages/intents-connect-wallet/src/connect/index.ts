/**
 * Chain-agnostic wallet connection: the modal, its presentation presets and the
 * coordinator. Requires `react` and `@headlessui/react`, but no chain SDK.
 *
 * Pair it with one or more connectors:
 *   ./connect/appkit   — EVM + Solana (Reown)
 *   ./connect/near     — NEAR (@hot-labs/near-connect)
 *   ./connect/stellar  — Stellar (@creit.tech/stellar-wallets-kit)
 */
export {
  WalletSelectorModal,
  type WalletSelectorModalProps,
} from '@/connect/WalletSelectorModal';
export { WalletOptionCard } from '@/connect/WalletOptionCard';
export { WalletIcon, type WalletIconProps } from '@/connect/WalletIcon';
export {
  useWalletSelector,
  type WalletSelectorState,
} from '@/connect/useWalletSelector';
export { CONNECTOR_IDS, type ConnectorId } from '@/connect/ids';
export {
  ALL_WALLET_OPTIONS,
  EVM_SOLANA_WALLET_OPTION,
  NEAR_WALLET_OPTION,
  STELLAR_WALLET_OPTION,
} from '@/connect/presets';
export type {
  ChainWalletConnector,
  WalletIconSpec,
  WalletOption,
} from '@/connect/types';
