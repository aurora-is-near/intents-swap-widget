/**
 * Stellar connection via `@creit.tech/stellar-wallets-kit`.
 *
 * Optional peer: `@creit.tech/stellar-wallets-kit` — a ~160M install closure,
 * which is the main reason these connectors are subpaths rather than bundled.
 */
export { useStellarWallet } from '@/connect/stellar/useStellarWallet';
export {
  useStellarConnector,
  type StellarConnectorState,
} from '@/connect/stellar/useStellarConnector';
