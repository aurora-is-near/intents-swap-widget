import type { ComponentType } from 'react';
import type {
  Providers,
  SupportedSigningStandard,
} from '@aurora-is-near/intents-connect';

/**
 * One chain family's connection state, contributed by a `./connect/*` subpath.
 *
 * The coordinator takes these as arguments rather than importing them, which is
 * what keeps `./connect` free of every chain SDK — the widget's
 * `useWalletSelector` imported all three directly and so could never be split.
 *
 * The optional members mirror the runner's `WalletConnector` so an adapter can
 * be built without reaching back into chain SDKs: omitting them silently
 * disables the runner features they feed (e.g. no `getChainId` means the
 * NETWORK_MISMATCH guard never fires for EVM origins).
 */
export type ChainWalletConnector = {
  /** Matches the `id` of the wallet option that selects it. */
  id: string;
  isConnected: boolean;
  address: string | undefined;
  connect: () => Promise<void> | void;
  disconnect: () => Promise<void> | void;
  /** Providers in the shapes `intents-connect`'s signers expect. */
  getProviders?: () => Providers;
  /**
   * The standard the CURRENT connection signs with. Undefined while
   * disconnected, or when the connector spans namespaces and none is active.
   */
  signingStandard?: SupportedSigningStandard;
  /** ed25519 chains: the connected account's public key. */
  getPublicKey?: () => string | undefined;
  /** EVM: feeds the runner's origin-network mismatch guard. */
  getChainId?: () => Promise<number>;
  /** Stellar: StrKey `G…` → 32 raw bytes, for the `sep53` signer. */
  decodePublicKey?: () => Uint8Array;
};

export type WalletIconSpec = {
  Icon: ComponentType;
  backgroundColor?: string;
};

/** Presentation for one row of the modal. Pure data — no chain SDK. */
export type WalletOption = {
  id: string;
  title: string;
  description: string;
  icons: WalletIconSpec[];
};
