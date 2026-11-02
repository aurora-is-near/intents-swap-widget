/**
 * What the user did with each wallet on this site, keyed by `DetectedWallet.id`:
 * `connected` through `connectDetectedWallet`, or `disconnected` through
 * `disconnectDetectedWallet`.
 *
 * Detection only touches a Solana or NEAR wallet the user connected here:
 * asking any other one — even "silently" — can open its UI, since some wallets
 * ignore `silent` and some map an account read to a sign-in.
 */
export const REMEMBERED_WALLETS_STORAGE_KEY =
  'intents-connect.connectedWallets';

export type RememberedConnection = 'connected' | 'disconnected';

type Memory = Record<string, RememberedConnection>;

// Guarded like the SDK's `webStorage`: storage can be absent (SSR), blocked
// (privacy settings, sandboxed iframes) or full, and none of that may break
// detection — the wallet is just not remembered.
const localStorageOrUndefined = () => {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
};

const read = (): Memory => {
  try {
    const raw = localStorageOrUndefined()?.getItem(
      REMEMBERED_WALLETS_STORAGE_KEY,
    );

    const stored: unknown = raw ? JSON.parse(raw) : {};

    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(stored).filter(
        (entry): entry is [string, RememberedConnection] =>
          entry[1] === 'connected' || entry[1] === 'disconnected',
      ),
    );
  } catch {
    // A corrupt record only means connecting again.
    return {};
  }
};

const write = (id: string, state: RememberedConnection) => {
  const memory = read();

  if (memory[id] === state) {
    return;
  }

  memory[id] = state;

  try {
    localStorageOrUndefined()?.setItem(
      REMEMBERED_WALLETS_STORAGE_KEY,
      JSON.stringify(memory),
    );
  } catch {
    // Not remembered; nothing else to do.
  }
};

/** What the user last did with the wallet here, if anything. */
export const getRememberedConnection = (
  id: string,
): RememberedConnection | undefined => read()[id];

export const rememberWalletConnection = (id: string) => write(id, 'connected');

export const forgetWalletConnection = (id: string) => write(id, 'disconnected');
