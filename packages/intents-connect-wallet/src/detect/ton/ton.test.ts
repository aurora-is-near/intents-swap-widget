// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  connectDetectedWallet,
  createWalletDetector,
  type DetectedWallet,
  disconnectDetectedWallet,
  type WalletDetector,
} from '@/detect';
import { toWalletConnector } from '@/detect/connector';
import { tonWallets } from '@/detect/ton';
import type { TonConnectClient, TonPeer } from '@/ton/types';

const PEER: TonPeer = {
  address: 'UQBNrjsFcpvNu5LZWuTuYQiQC0VeiBOmogFAzrP7AJOnWsaE',
  rawAddress:
    '0:4dae3b05729bcdbb92d95ae4ee6108900b455e8813a6a20140ceb3fb0093a75a',
  publicKey: 'ed25519:11111111111111111111111111111112',
  appName: 'tonkeeper',
  name: 'Tonkeeper',
  jsBridgeKey: 'tonkeeper',
  signsText: true,
  mainnet: true,
};

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
  store.clear();
  detectors.splice(0).forEach((detector) => detector.destroy());
});

/** A client whose session the test sets. */
const fakeClient = (restored: TonPeer | null = null) => {
  let peer = restored;
  const listeners = new Set<(next: TonPeer | null) => void>();
  const set = (next: TonPeer | null) => {
    peer = next;
    listeners.forEach((listener) => listener(next));
  };

  return {
    getPeer: vi.fn(async () => peer),
    currentPeer: () => peer,
    onChange: (listener: (next: TonPeer | null) => void) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    listExtensions: vi.fn(async () => [
      { appName: 'tonkeeper', name: 'Tonkeeper', jsBridgeKey: 'tonkeeper' },
      {
        appName: 'mytonwallet',
        name: 'MyTonWallet',
        jsBridgeKey: 'mytonwallet',
      },
    ]),
    connectExtension: vi.fn(async () => {
      set(PEER);

      return PEER;
    }),
    disconnect: vi.fn(async () => set(null)),
    set,
  } as unknown as TonConnectClient & {
    set: (next: TonPeer | null) => void;
    connectExtension: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };
};

const detect = async (client: TonConnectClient) => {
  const detector = createWalletDetector({
    families: [],
    sources: [tonWallets(client)],
  });

  detectors.push(detector);
  await vi.waitFor(() =>
    expect(detector.getSnapshot().wallets.length).toBeGreaterThan(0),
  );

  return detector;
};

const walletOf = (detector: WalletDetector, id: string) =>
  detector
    .getSnapshot()
    .wallets.find((wallet) => wallet.id === id) as DetectedWallet;

describe('tonWallets', () => {
  it('lists installed extensions, the restored one with its account', async () => {
    const detector = await detect(fakeClient(PEER));

    expect(
      detector
        .getSnapshot()
        .wallets.map(({ id, address }) => ({ id, address })),
    ).toEqual([
      { id: 'ton:tonkeeper', address: PEER.address },
      { id: 'ton:mytonwallet', address: null },
    ]);
  });

  it('connects through the client and disconnects the session it holds', async () => {
    const client = fakeClient();
    const detector = await detect(client);

    await connectDetectedWallet(walletOf(detector, 'ton:tonkeeper'));
    await detector.refresh();

    expect(client.connectExtension).toHaveBeenCalledWith(
      'tonkeeper',
      expect.anything(),
    );
    expect(walletOf(detector, 'ton:tonkeeper').address).toBe(PEER.address);

    // Another extension doesn't hold the session: nothing to end.
    await disconnectDetectedWallet(walletOf(detector, 'ton:mytonwallet'));

    expect(client.disconnect).not.toHaveBeenCalled();

    await disconnectDetectedWallet(walletOf(detector, 'ton:tonkeeper'));
    await detector.refresh();

    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect(walletOf(detector, 'ton:tonkeeper').address).toBeNull();
  });

  it("doesn't list a phone's session as an extension", async () => {
    const detector = await detect(
      fakeClient({ ...PEER, jsBridgeKey: undefined }),
    );

    expect(
      detector.getSnapshot().wallets.every((wallet) => wallet.address === null),
    ).toBe(true);
  });

  it('adapts the connected one into a ton_connect connector', async () => {
    const detector = await detect(fakeClient(PEER));
    const { connector } = toWalletConnector(
      walletOf(detector, 'ton:tonkeeper'),
    );

    expect(connector).toMatchObject({
      signingStandard: 'ton_connect',
      chains: ['ton'],
    });
  });
});
