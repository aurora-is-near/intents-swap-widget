// @vitest-environment node
/* eslint-env browser -- `window` is the stub below. */
// Stellar's crypto rejects jsdom's cross-realm Uint8Array; a stub `window`
// with a memory localStorage is all detection needs here.
import { hash, Keypair } from '@stellar/stellar-sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  connectDetectedWallet,
  createWalletDetector,
  type DetectedWallet,
  disconnectDetectedWallet,
  type WalletDetector,
} from '@/detect';
import { toWalletConnector } from '@/detect/connector';
import {
  isSep53Signature,
  moduleProvider,
  type StellarModule,
  stellarWallets,
} from '@/detect/stellar';

// The real modules are never constructed here (the tests pass their own),
// and Node can't load them: Freighter's API is CommonJS with named imports.
vi.mock('@creit.tech/stellar-wallets-kit/modules/freighter', () => ({
  FreighterModule: class {},
}));
vi.mock('@creit.tech/stellar-wallets-kit/modules/xbull', () => ({
  // Like the real one: available whether or not the extension is there.
  xBullModule: class {
    productId = 'xbull';

    productName = 'xBull';

    isAvailable = async () => true;
  },
}));
vi.mock('@creit.tech/stellar-wallets-kit/modules/lobstr', () => ({
  LobstrModule: class {},
}));
vi.mock('@creit.tech/stellar-wallets-kit/modules/hana', () => ({
  HanaModule: class {},
}));

const store = new Map<string, string>();

vi.stubGlobal('window', {
  localStorage: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  },
});

const detectors: WalletDetector[] = [];

afterEach(() => {
  window.localStorage.clear();
  delete (window as { xBullSDK?: unknown }).xBullSDK;
  detectors.splice(0).forEach((detector) => detector.destroy());
});

const keypair = Keypair.random();
const ADDRESS = keypair.publicKey();

const sep53 = (message: string, signer = keypair) =>
  signer
    .sign(hash(`Stellar Signed Message:\n${message}` as never))
    .toString('base64');

const fakeModule = (
  productId: string,
  {
    available = true,
    address = ADDRESS,
  }: { available?: boolean; address?: string | null } = {},
): StellarModule & {
  getAddress: ReturnType<typeof vi.fn>;
  signMessage: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
} =>
  ({
    productId,
    productName: productId === 'freighter' ? 'Freighter' : 'Hana',
    productIcon: `https://icons.test/${productId}.png`,
    isAvailable: vi.fn(async () => available),
    getAddress: vi.fn(async (params?: { skipRequestAccess?: boolean }) => {
      if (address === null) {
        throw new Error('not allowed');
      }

      return { address, silent: params?.skipRequestAccess === true };
    }),
    signMessage: vi.fn(async (message: string) => ({
      signedMessage: sep53(message),
      signerAddress: ADDRESS,
    })),
    signTransaction: vi.fn(),
    disconnect: vi.fn(async () => undefined),
  }) as never;

/** A detector over the given modules, settled. */
const detect = async (modules: StellarModule[]) => {
  const detector = createWalletDetector({
    families: [],
    sources: [stellarWallets({ modules: () => modules })],
  });

  detectors.push(detector);

  // Ready, then the availability check lands.
  await vi.waitFor(() =>
    expect(detector.getSnapshot().wallets.length).toBeGreaterThan(0),
  );

  return detector;
};

const walletOf = (detector: WalletDetector, id: string) =>
  detector
    .getSnapshot()
    .wallets.find((wallet) => wallet.id === id) as DetectedWallet;

describe('stellarWallets', () => {
  it('lists the available wallets only, and restores Freighter silently', async () => {
    const freighter = fakeModule('freighter');
    const detector = await detect([
      freighter,
      fakeModule('lobstr', { available: false }),
    ]);

    expect(detector.getSnapshot().wallets.map((wallet) => wallet.id)).toEqual([
      'stellar:freighter',
    ]);

    await vi.waitFor(() =>
      expect(walletOf(detector, 'stellar:freighter').address).toBe(ADDRESS),
    );

    expect(freighter.getAddress).toHaveBeenCalledWith({
      skipRequestAccess: true,
    });
  });

  it("lists xBull only with its extension, not its web wallet's popups", async () => {
    const listed = async () => {
      const detector = createWalletDetector({
        families: [],
        sources: [stellarWallets()],
      });

      detectors.push(detector);

      // Every default module answers; the mocked others aren't available.
      await vi.waitFor(() => expect(detector.getSnapshot().ready).toBe(true));
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      await detector.refresh();

      return detector.getSnapshot().wallets.map((wallet) => wallet.id);
    };

    expect(await listed()).toEqual([]);

    (window as { xBullSDK?: unknown }).xBullSDK = {};

    expect(await listed()).toEqual(['stellar:xbull']);
  });

  it('asks other wallets for an address only on connect, then restores it from memory', async () => {
    const hana = fakeModule('hana');
    const detector = await detect([hana]);
    const wallet = walletOf(detector, 'stellar:hana');

    expect(wallet.address).toBeNull();
    expect(hana.getAddress).not.toHaveBeenCalled();

    await connectDetectedWallet(wallet);
    await detector.refresh();

    expect(hana.getAddress).toHaveBeenCalledWith();
    expect(walletOf(detector, 'stellar:hana').address).toBe(ADDRESS);

    // A fresh detector (a reload) restores it without asking.
    const reloaded = await detect([fakeModule('hana')]);

    await vi.waitFor(() =>
      expect(walletOf(reloaded, 'stellar:hana').address).toBe(ADDRESS),
    );
  });

  it('forgets a disconnected wallet', async () => {
    const hana = fakeModule('hana');
    const detector = await detect([hana]);

    await connectDetectedWallet(walletOf(detector, 'stellar:hana'));
    await detector.refresh();
    await disconnectDetectedWallet(walletOf(detector, 'stellar:hana'));
    await detector.refresh();

    expect(hana.disconnect).toHaveBeenCalledTimes(1);
    expect(walletOf(detector, 'stellar:hana').address).toBeNull();
  });

  it('keeps the same wallet object while nothing changed', async () => {
    const detector = await detect([fakeModule('freighter')]);

    await vi.waitFor(() =>
      expect(walletOf(detector, 'stellar:freighter').address).toBe(ADDRESS),
    );

    const before = walletOf(detector, 'stellar:freighter');

    await detector.refresh();

    expect(walletOf(detector, 'stellar:freighter')).toBe(before);
  });

  it('adapts into a sep53 connector', async () => {
    const detector = await detect([fakeModule('freighter')]);

    await vi.waitFor(() =>
      expect(walletOf(detector, 'stellar:freighter').address).toBe(ADDRESS),
    );

    const { connector } = toWalletConnector(
      walletOf(detector, 'stellar:freighter'),
    );

    expect(connector).toMatchObject({
      id: 'stellar:freighter',
      signingStandard: 'sep53',
      chains: ['stellar'],
    });
    expect(connector?.getAddress()).toBe(ADDRESS);
    expect(connector?.getPublicKey?.()).toMatch(/^ed25519:/);
    expect(connector?.getProviders().stellar?.publicKey).toBe(ADDRESS);
  });
});

describe('the SEP-53 check', () => {
  it("accepts the account's own SEP-53 signature only", () => {
    expect(isSep53Signature(ADDRESS, 'hello', sep53('hello'))).toBe(true);
    expect(isSep53Signature(ADDRESS, 'other', sep53('hello'))).toBe(false);
    expect(
      isSep53Signature(ADDRESS, 'hello', sep53('hello', Keypair.random())),
    ).toBe(false);
  });

  it('passes the address to the wallet, and refuses a signature that fails the check', async () => {
    const good = fakeModule('hana');
    const provider = moduleProvider(good, ADDRESS);

    await expect(provider.signMessage('payload')).resolves.toMatchObject({
      signerAddress: ADDRESS,
    });
    expect(good.signMessage).toHaveBeenCalledWith(
      'payload',
      expect.objectContaining({ address: ADDRESS }),
    );

    const wrongAccount = fakeModule('hana');

    wrongAccount.signMessage.mockResolvedValue({
      signedMessage: sep53('payload', Keypair.random()),
      signerAddress: ADDRESS,
    });

    await expect(
      moduleProvider(wrongAccount, ADDRESS).signMessage('payload'),
    ).rejects.toThrow(/another account, or not as SEP-53 requires/);
  });
});
