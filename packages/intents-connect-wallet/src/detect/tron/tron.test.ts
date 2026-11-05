/* eslint-env browser */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  connectDetectedWallet,
  createWalletDetector,
  type DetectedWallet,
  disconnectDetectedWallet,
  type WalletDetector,
} from '@/detect';
import { toWalletConnector } from '@/detect/connector';
import { tronWallets } from '@/detect/tron';
import type { TronInjectedProvider } from '@/tron/types';

const ADDRESS = 'TNXoiAJ3dct8Fjg4M9fkLFh9S2v9TXc32G';
const SIGNATURE = `0x${'ab'.repeat(64)}1c`;

const detectors: WalletDetector[] = [];
const announcers: (() => void)[] = [];

afterEach(() => {
  window.localStorage.clear();
  delete (window as { tron?: unknown }).tron;
  announcers.splice(0).forEach((remove) => remove());
  detectors.splice(0).forEach((detector) => detector.destroy());
});

/** TronLink's provider: `tronWeb` appears once the site is connected. */
const tronLink = ({
  connected = false,
  signer = ADDRESS,
}: { connected?: boolean; signer?: string } = {}) => {
  const listeners = new Set<(data: unknown) => void>();
  const tronWeb = {
    defaultAddress: { base58: ADDRESS },
    trx: {
      signMessageV2: vi.fn(async () => SIGNATURE),
      verifyMessageV2: vi.fn(async () => signer),
    },
  };

  const provider = {
    tronWeb: connected ? tronWeb : false,
    request: vi.fn(async ({ method }: { method: string }) => {
      if (method !== 'eth_requestAccounts') {
        throw new Error(`unsupported ${method}`);
      }

      setTimeout(() => {
        provider.tronWeb = tronWeb;
      }, 20);

      return [ADDRESS];
    }),
    on: (_: string, listener: (data: unknown) => void) =>
      listeners.add(listener),
    removeListener: (_: string, listener: (data: unknown) => void) =>
      listeners.delete(listener),
    emit: (data: unknown) => listeners.forEach((listener) => listener(data)),
  };

  return provider as typeof provider & TronInjectedProvider;
};

/** Answers TIP-6963 requests the way TronLink does. */
const announce = (provider: TronInjectedProvider) => {
  const detail = {
    info: {
      uuid: 'uuid-1',
      name: 'TronLink',
      icon: 'data:,',
      rdns: 'org.tronlink.www',
    },
    provider,
  };

  const onRequest = () =>
    window.dispatchEvent(
      new CustomEvent('TIP6963:announceProvider', { detail }),
    );

  window.addEventListener('TIP6963:requestProvider', onRequest);
  announcers.push(() =>
    window.removeEventListener('TIP6963:requestProvider', onRequest),
  );
};

const detect = async () => {
  const detector = createWalletDetector({
    families: [],
    sources: [tronWallets()],
  });

  detectors.push(detector);
  await vi.waitFor(() => expect(detector.getSnapshot().ready).toBe(true));
  await detector.refresh();

  return detector;
};

const only = (detector: WalletDetector) =>
  detector.getSnapshot().wallets[0] as DetectedWallet;

describe('tronWallets', () => {
  it('lists an announced wallet, with the account it already shares', async () => {
    announce(tronLink({ connected: true }));

    const wallet = only(await detect());

    expect(wallet).toMatchObject({
      id: 'tron:org.tronlink.www',
      family: 'tron',
      name: 'TronLink',
      address: ADDRESS,
    });
  });

  it('connects through eth_requestAccounts, then reads the account its tronWeb shares', async () => {
    const provider = tronLink();

    announce(provider);

    const detector = await detect();

    expect(only(detector).address).toBeNull();

    await connectDetectedWallet(only(detector));
    await detector.refresh();

    expect(provider.request).toHaveBeenCalledWith({
      method: 'eth_requestAccounts',
    });
    expect(only(detector).address).toBe(ADDRESS);
  });

  it('forgets a disconnected wallet even though TronLink keeps sharing', async () => {
    announce(tronLink({ connected: true }));

    const detector = await detect();

    await disconnectDetectedWallet(only(detector));
    await detector.refresh();

    expect(only(detector).address).toBeNull();
  });

  it('re-reads on accountsChanged, which also reports a lock', async () => {
    const provider = tronLink({ connected: true });

    announce(provider);

    const detector = await detect();

    provider.tronWeb = false;
    provider.emit([]);

    await vi.waitFor(() => expect(only(detector).address).toBeNull());
  });

  it('falls back to window.tron when no wallet announces itself', async () => {
    (window as { tron?: unknown }).tron = tronLink({ connected: true });

    expect(only(await detect())).toMatchObject({
      id: 'tron:injected',
      address: ADDRESS,
    });
  });

  it('adapts into a tip191 connector that checks who signed', async () => {
    announce(tronLink({ connected: true }));

    const { connector } = toWalletConnector(only(await detect()));

    expect(connector).toMatchObject({
      id: 'tron:org.tronlink.www',
      signingStandard: 'tip191',
      chains: ['tron'],
    });

    const tron = connector!.getProviders().tron!;

    await expect(tron.signMessage('payload')).resolves.toBe(SIGNATURE);

    announcers.splice(0).forEach((remove) => remove());
    detectors.splice(0).forEach((detector) => detector.destroy());
    announce(tronLink({ connected: true, signer: 'TOTHER' }));

    const other = toWalletConnector(only(await detect())).connector!;

    await expect(
      other.getProviders().tron!.signMessage('payload'),
    ).rejects.toThrow(/another account/);
  });
});
