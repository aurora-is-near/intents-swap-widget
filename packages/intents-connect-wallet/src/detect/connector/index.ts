/**
 * One call for any detected wallet: dispatches to the adapter of its family.
 * Unlike `./detect`, this entry pulls every family's transfer code, so it
 * needs the optional peers of `./evm` (`viem`) and `./solana`
 * (`@solana/web3.js`, `@solana/spl-token`). Import the per-chain adapters
 * instead when an app only handles some families.
 */
export {
  toWalletConnector,
  type WalletConnectorOptions,
} from '@/detect/connector/toWalletConnector';
