/* eslint-env browser */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  connectDetectedWallet,
  createWalletDetector,
  type DetectedWallet,
  disconnectDetectedWallet,
  getRememberedAddress,
  getRememberedConnection,
  isPluggableWallet,
  rememberWalletAddress,
  type WalletDetector,
  type WalletSource,
} from '@/detect';
import { toWalletConnector } from '@/detect/connector';

const detectors: WalletDetector[] = [];

afterEach(() => {
  window.localStorage.clear();
  detectors.splice(0).forEach((detector) => detector.destroy());
});

/** A plug-in wallet, as a source for another family would build it. */
const pluginWallet = (address: string | null = null) => {
  const wallet = {
    id: 'stellar:freighter',
    family: 'stellar',
    name: 'Freighter',
    address,
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    toConnector: vi.fn(() => ({
      connector: null,
      unsupportedReason: 'NOT_CONNECTED' as const,
    })),
  };

  return wallet as typeof wallet & DetectedWallet;
};

/** A source whose wallet list the test sets, with its `onChange` exposed. */
const pluginSource = (id = 'test') => {
  let wallets: DetectedWallet[] = [];
  let onChange = () => undefined as void;
  const stop = vi.fn();

  const source: WalletSource = {
    id,
    create: (changed) => {
      onChange = changed;

      return { start: () => undefined, read: async () => wallets, stop };
    },
  };

  return {
    source,
    stop,
    set: (next: DetectedWallet[]) => {
      wallets = next;
      onChange();
    },
  };
};

const settled = (detector: WalletDetector) =>
  new Promise<void>((resolve) => {
    const unsubscribe = detector.subscribe(() => {
      unsubscribe();
      resolve();
    });
  });

describe('plug-in sources', () => {
  it("lists a source's wallets next to the built-in families, and re-reads on its change", async () => {
    const plugin = pluginSource();
    const detector = createWalletDetector({
      families: [],
      sources: [plugin.source],
    });

    detectors.push(detector);
    await settled(detector);

    expect(detector.getSnapshot()).toMatchObject({ ready: true, wallets: [] });

    const wallet = pluginWallet('GABC');
    const next = settled(detector);

    plugin.set([wallet]);
    await next;

    expect(detector.getSnapshot().wallets).toEqual([wallet]);
  });

  it('stops the source with the detector', () => {
    const plugin = pluginSource();

    createWalletDetector({ families: [], sources: [plugin.source] }).destroy();

    expect(plugin.stop).toHaveBeenCalledTimes(1);
  });

  it("connects and disconnects through the wallet's own methods", async () => {
    const wallet = pluginWallet();

    expect(isPluggableWallet(wallet)).toBe(true);

    await connectDetectedWallet(wallet);

    expect(wallet.connect).toHaveBeenCalledTimes(1);
    expect(getRememberedConnection(wallet.id)).toBe('connected');

    rememberWalletAddress(wallet.id, 'GABC');
    await disconnectDetectedWallet(wallet);

    expect(wallet.disconnect).toHaveBeenCalledTimes(1);
    expect(getRememberedConnection(wallet.id)).toBe('disconnected');
    // A disconnected wallet is not restored from its remembered address.
    expect(getRememberedAddress(wallet.id)).toBeUndefined();
  });

  it('stops waiting on a cancelled connection, and forgets it', async () => {
    const wallet = pluginWallet();
    const controller = new AbortController();

    // A wallet that never answers, e.g. its popup was closed.
    wallet.connect.mockReturnValue(
      new Promise<undefined>(() => {
        // Never settles.
      }),
    );

    const connecting = connectDetectedWallet(wallet, {
      signal: controller.signal,
    });

    controller.abort();

    await expect(connecting).rejects.toThrow(/cancelled/);
    expect(wallet.connect).toHaveBeenCalledWith({ signal: controller.signal });
    expect(getRememberedConnection(wallet.id)).toBeUndefined();
  });

  it("adapts itself, given its family's options", () => {
    const wallet = pluginWallet('GABC');
    const options = { stellar: { horizonUrls: ['https://horizon.test'] } };

    expect(toWalletConnector(wallet, options as never)).toEqual({
      connector: null,
      unsupportedReason: 'NOT_CONNECTED',
    });
    expect(wallet.toConnector).toHaveBeenCalledWith(options.stellar);
  });
});
