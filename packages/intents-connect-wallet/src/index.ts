/**
 * Chain-agnostic root. Everything chain-specific lives behind a subpath so its
 * SDK is only installed when it is actually used:
 *
 *   ./evm      ./solana      ./stellar      ./near      — deposit transfers
 *   ./connect  ./connect/appkit  ./connect/near  ./connect/stellar — wallet connection
 *
 * Re-exported here for convenience when writing your own transfer against the
 * same contract. Importing this entry pulls no chain SDK and no React.
 */
export type {
  MakeTransfer,
  MakeTransferArgs,
  TransferPlugin,
  TransferPlugins,
  TransferResult,
} from '@aurora-is-near/intents-connect';
export { resolveTransferAmount } from '@aurora-is-near/intents-connect';
