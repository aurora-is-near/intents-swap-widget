import type { Passkey } from '../passkey/webauthn';
import type { WalletFamily } from '../wallet/types';

type PasskeyAccount = Passkey & {
  kind: 'passkey';
  id: string;
  name: string;
  /** Derived from the public key; not an address on any chain. */
  intentsAccountId: string;
  createdAt: number;
};

/**
 * A wallet connected to the extension: a browser wallet through the connector
 * page, or a mobile wallet over WalletConnect.
 */
export type WalletAccount = {
  kind: 'wallet';
  /** Absent for browser wallets (accounts stored before it existed). */
  source?: 'walletconnect';
  id: string;
  name: string;
  family: WalletFamily;
  /** The detected wallet, e.g. `evm:io.metamask`, `sol:Phantom`. */
  walletId: string;
  /** How the bridge addresses it: EVM id, Solana name or NEAR manifest id. */
  bridgeId: string;
  walletName: string;
  walletIcon?: string;
  address: string;
  /** NEAR: the account's key, needed to resolve it. */
  publicKey?: string;
  createdAt: number;
};

export type Account = PasskeyAccount | WalletAccount;

export type AccountsState = {
  accounts: Account[];
  activeId: string | null;
};
