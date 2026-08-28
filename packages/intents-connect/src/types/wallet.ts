import type { Chain } from '@/types/execution';
import type { Providers } from '@/types/providers';
import type { SupportedSigningStandard } from '@/types/signing';
import type { MakeTransferArgs, TransferResult } from '@/types/transfer';

/**
 * A connectable wallet, contributed by a `-wallet-*` package.
 *
 * Chain-agnostic on purpose: `intents-connect-ui` renders whatever
 * `WalletConnector[]` it is handed and holds no chain knowledge, and this
 * package holds no chain SDK.
 */
export type WalletConnector = {
  id: string;
  /** Display name, e.g. "MetaMask". */
  name: string;
  /** Chains this connector can act on. */
  chains: readonly Chain[];
  /**
   * The standard the connected wallet signs with. Restricted to the subset this
   * package implements — a connector we cannot sign for is unusable.
   */
  signingStandard: SupportedSigningStandard;

  connect: () => Promise<void>;
  disconnect: () => Promise<void>;

  /** Connected address, or undefined when disconnected. */
  getAddress: () => string | undefined;
  /** ed25519 chains only. TON must capture this at connect time. */
  getPublicKey?: () => string | undefined;
  /** Providers in the shapes this package's signers expect. */
  getProviders: () => Providers;

  /** Deposit transfer for this chain. Owned by the `-wallet-*` package. */
  makeTransfer?: (
    args: MakeTransferArgs,
  ) => Promise<Pick<TransferResult, 'hash'>>;

  /**
   * Stellar only: StrKey → 32 raw bytes. Injected so `@stellar/stellar-sdk`
   * stays out of this package.
   */
  decodePublicKey?: () => Uint8Array;

  /** EVM only: feeds the origin-network mismatch guard. */
  getChainId?: () => Promise<number>;
};
