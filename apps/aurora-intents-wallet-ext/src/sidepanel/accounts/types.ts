import type { Passkey } from '../passkey/webauthn';

type PasskeyAccount = Passkey & {
  kind: 'passkey';
  id: string;
  name: string;
  /** Derived from the public key; not an address on any chain. */
  intentsAccountId: string;
  createdAt: number;
};

// Connected-wallet accounts join this union with the wallet flows.
export type Account = PasskeyAccount;

export type AccountsState = {
  accounts: Account[];
  activeId: string | null;
};
