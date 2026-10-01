/**
 * NEAR side of the page bridge (MAIN world). NEAR browser wallets (HOT and
 * others) follow near-connect's injection protocol: the page announces
 * `near-selector-ready`, and each wallet answers with a `near-wallet-injected`
 * event carrying its API. Connecting is only ever done from the extension's
 * connector page — no site in scope uses NEAR wallets.
 */
import { base64ToBytes, bytesToBase64, NEAR_METHODS } from '../shared/bridge';
import type { NearWalletEntry } from '../shared/bridge';

type NearAccount = { accountId: string; publicKey: string };

type NearNetwork = 'mainnet';

type InjectedNearWallet = {
  manifest: { id: string; name: string; icon?: string };
  signIn: (data?: { network?: NearNetwork }) => Promise<NearAccount[]>;
  getAccounts: (data?: { network?: NearNetwork }) => Promise<NearAccount[]>;
  signMessage: (params: {
    message: string;
    recipient: string;
    nonce: Uint8Array;
    network?: NearNetwork;
  }) => Promise<{
    accountId: string;
    publicKey: string;
    signature: string | Uint8Array;
  }>;
  signAndSendTransactions: (params: {
    transactions: unknown[];
    network?: NearNetwork;
  }) => Promise<{ transaction?: { hash?: string } }[] | undefined>;
};

const NETWORK: NearNetwork = 'mainnet';

const wallets = new Map<string, InjectedNearWallet>();

/** Re-announces the page, for wallets that loaded after the first call. */
const requestNearWallets = () =>
  window.dispatchEvent(new Event('near-selector-ready'));

export const initNearWallets = () => {
  window.addEventListener('near-wallet-injected', (event) => {
    const wallet = (event as CustomEvent<InjectedNearWallet>).detail;

    if (wallet?.manifest?.id) {
      wallets.set(wallet.manifest.id, wallet);
    }
  });

  requestNearWallets();
};

export const getNearWallets = (): NearWalletEntry[] => {
  requestNearWallets();

  return [...wallets.values()].map(({ manifest }) => ({
    id: manifest.id,
    info: { name: manifest.name, icon: manifest.icon },
  }));
};

export const isNearMethod = (method: string) =>
  (Object.values(NEAR_METHODS) as string[]).includes(method);

const requireWallet = (id: unknown) => {
  const wallet = typeof id === 'string' ? wallets.get(id) : undefined;

  if (!wallet) {
    throw Object.assign(new Error('That NEAR wallet is not available'), {
      code: 4900,
    });
  }

  return wallet;
};

/**
 * Signed-in account for this page. A freshly opened connector page asks the
 * wallet first (no prompt once the origin is trusted), signing in otherwise.
 */
const requireAccount = async (wallet: InjectedNearWallet) => {
  const [existing] = await wallet.getAccounts({ network: NETWORK });
  const [account] = existing
    ? [existing]
    : await wallet.signIn({ network: NETWORK });

  if (!account) {
    throw Object.assign(new Error(`${wallet.manifest.name} has no account`), {
      code: 4100,
    });
  }

  return account;
};

export const handleNearRequest = async (
  method: string,
  params: unknown,
): Promise<unknown> => {
  const input = (params ?? {}) as Record<string, unknown>;
  const wallet = requireWallet(input.id);

  switch (method) {
    case NEAR_METHODS.connect: {
      const [account] = await wallet.signIn({ network: NETWORK });

      if (!account) {
        throw new Error(`${wallet.manifest.name} did not share an account`);
      }

      return { accountId: account.accountId, publicKey: account.publicKey };
    }

    case NEAR_METHODS.signMessage: {
      await requireAccount(wallet);

      const signed = await wallet.signMessage({
        message: String(input.message),
        recipient: String(input.recipient),
        nonce: base64ToBytes(String(input.nonce)),
        network: NETWORK,
      });

      return {
        accountId: signed.accountId,
        publicKey: signed.publicKey,
        // Wallets return base64 text or raw bytes; the SDK takes either.
        signature:
          typeof signed.signature === 'string'
            ? signed.signature
            : bytesToBase64(signed.signature),
      };
    }

    case NEAR_METHODS.signAndSendTransactions: {
      await requireAccount(wallet);

      const outcomes = await wallet.signAndSendTransactions({
        transactions: input.transactions as unknown[],
        network: NETWORK,
      });

      // Only the hash crosses back — full outcomes are large and unneeded.
      return (outcomes ?? []).map((outcome) => ({
        transaction: { hash: outcome.transaction?.hash },
      }));
    }

    default:
      throw new Error(`Unknown NEAR method: ${method}`);
  }
};
