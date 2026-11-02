/**
 * Solana side of the page bridge (MAIN world). Solana wallets don't inject an
 * RPC provider; they register through the Wallet Standard and expose
 * features. Polymarket never connects one, so connecting is always an explicit
 * user action from the panel — a wallet that already trusts the site approves
 * without a prompt. Every method names the wallet it targets (`name`).
 */
import { base64ToBytes, bytesToBase64, SOLANA_METHODS } from '../shared/bridge';
import type { SolanaWalletEntry, WalletInfo } from '../shared/bridge';

type StandardAccount = { address: string };

type StandardWallet = {
  name: string;
  icon: string;
  chains: readonly string[];
  accounts: readonly StandardAccount[];
  features: Record<string, unknown>;
};

type ConnectFeature = {
  connect: (input?: {
    silent?: boolean;
  }) => Promise<{ accounts: readonly StandardAccount[] }>;
};

type EventsFeature = {
  on: (event: 'change', listener: () => void) => () => void;
};

type SignMessageFeature = {
  signMessage: (
    ...inputs: { account: StandardAccount; message: Uint8Array }[]
  ) => Promise<readonly { signature: Uint8Array }[]>;
};

type SignTransactionFeature = {
  signTransaction: (
    ...inputs: {
      account: StandardAccount;
      transaction: Uint8Array;
      chain: string;
    }[]
  ) => Promise<readonly { signedTransaction: Uint8Array }[]>;
};

const MAINNET = 'solana:mainnet';

const REQUIRED_FEATURES = [
  'standard:connect',
  'solana:signMessage',
  'solana:signTransaction',
];

const wallets = new Map<string, StandardWallet>();
const unsubscribers = new Map<string, () => void>();
let notify: () => void = () => undefined;

const isSolanaWallet = (wallet: StandardWallet) =>
  wallet.chains.some((chain) => chain.startsWith('solana:')) &&
  REQUIRED_FEATURES.every((feature) => feature in wallet.features);

const register = (...registered: StandardWallet[]) => {
  registered.filter(isSolanaWallet).forEach((wallet) => {
    wallets.set(wallet.name, wallet);

    const events = wallet.features['standard:events'] as
      | EventsFeature
      | undefined;

    unsubscribers.get(wallet.name)?.();
    unsubscribers.set(
      wallet.name,
      events?.on('change', () => notify()) ?? (() => undefined),
    );
  });

  return () => undefined;
};

/** Starts discovery; `onChange` fires when a wallet's accounts change. */
export const initSolanaWallets = (onChange: () => void) => {
  notify = onChange;

  // Wallets loaded after us announce themselves...
  window.addEventListener('wallet-standard:register-wallet', (event) => {
    const callback = (
      event as CustomEvent<(api: { register: typeof register }) => void>
    ).detail;

    if (typeof callback === 'function') {
      callback({ register });
    }
  });

  // ...and wallets loaded before us answer this.
  window.dispatchEvent(
    new CustomEvent('wallet-standard:app-ready', { detail: { register } }),
  );
};

const toInfo = (wallet: StandardWallet): WalletInfo => ({
  name: wallet.name,
  icon: wallet.icon,
});

const requireWallet = (name: unknown) => {
  const wallet = typeof name === 'string' ? wallets.get(name) : undefined;

  if (!wallet) {
    throw Object.assign(new Error('That Solana wallet is not available'), {
      code: 4900,
    });
  }

  return wallet;
};

/**
 * The account to sign with. A page opened afresh (the extension's connector
 * window) has no accounts until the wallet reconnects, which a wallet that
 * already trusts the origin does silently.
 */
const requireAccount = async (name: unknown) => {
  const wallet = requireWallet(name);

  if (wallet.accounts.length === 0) {
    await (wallet.features['standard:connect'] as ConnectFeature).connect({
      silent: true,
    });
  }

  const [account] = wallet.accounts;

  if (!account) {
    throw Object.assign(new Error('The Solana wallet has no account'), {
      code: 4100,
    });
  }

  return { wallet, account };
};

/** Each wallet with the account it shares with this site, if any. */
export const getSolanaWallets = (): SolanaWalletEntry[] =>
  [...wallets.values()].map((wallet) => ({
    info: toInfo(wallet),
    address: wallet.accounts[0]?.address ?? null,
  }));

export const isSolanaMethod = (method: string) =>
  (Object.values(SOLANA_METHODS) as string[]).includes(method);

export const handleSolanaRequest = async (
  method: string,
  params: unknown,
): Promise<unknown> => {
  const input = (params ?? {}) as Record<string, unknown>;

  switch (method) {
    case SOLANA_METHODS.connect: {
      const wallet = requireWallet(input.name);

      const { accounts } = await (
        wallet.features['standard:connect'] as ConnectFeature
      ).connect({ silent: input.silent === true });

      const [account] = accounts.length > 0 ? accounts : wallet.accounts;

      if (!account) {
        throw new Error(`${wallet.name} did not share an account`);
      }

      return account.address;
    }

    case SOLANA_METHODS.signMessage: {
      const { wallet, account } = await requireAccount(input.name);
      const [output] = await (
        wallet.features['solana:signMessage'] as SignMessageFeature
      ).signMessage({
        account,
        message: base64ToBytes(String(input.message)),
      });

      if (!output) {
        throw new Error('The wallet returned no signature');
      }

      return bytesToBase64(output.signature);
    }

    case SOLANA_METHODS.signTransaction: {
      const { wallet, account } = await requireAccount(input.name);
      const [output] = await (
        wallet.features['solana:signTransaction'] as SignTransactionFeature
      ).signTransaction({
        account,
        transaction: base64ToBytes(String(input.transaction)),
        chain: MAINNET,
      });

      if (!output) {
        throw new Error('The wallet returned no signed transaction');
      }

      return bytesToBase64(output.signedTransaction);
    }

    default:
      throw new Error(`Unknown Solana method: ${method}`);
  }
};
