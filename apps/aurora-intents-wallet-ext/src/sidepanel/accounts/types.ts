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

/** A browser wallet connected to the extension through the connector page. */
export type WalletAccount = {
  kind: 'wallet';
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
