/* eslint-env browser */
import { type ReactNode, StrictMode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useDetectedWallets } from '@/detect/react';

const ADDRESS = '0xca67c1bb3fd69857e5edaf6aa1c65371bf46a464';

const handlers: (() => void)[] = [];

afterEach(() => {
  handlers.splice(0).forEach((remove) => remove());
});

const announce = () => {
  const provider = {
    request: async ({ method }: { method: string }) =>
      method === 'eth_accounts' ? [ADDRESS] : '0x1',
  };

  const handler = () =>
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: {
          info: { uuid: 'u', name: 'MetaMask', rdns: 'io.metamask' },
          provider,
        },
      }),
    );

  window.addEventListener('eip6963:requestProvider', handler);
  handlers.push(() =>
    window.removeEventListener('eip6963:requestProvider', handler),
  );
};

const strict = ({ children }: { children: ReactNode }) => (
  <StrictMode>{children}</StrictMode>
);

describe('useDetectedWallets', () => {
  it('reports detected wallets under StrictMode', async () => {
    announce();

    const { result } = renderHook(
      () => useDetectedWallets({ families: ['evm'] }),
      { wrapper: strict },
    );

    expect(result.current.ready).toBe(false);

    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.wallets).toMatchObject([
      { id: 'evm:io.metamask', address: ADDRESS },
    ]);
  });

  it('shares one detector between hooks with the same options', async () => {
    announce();

    const a = renderHook(() => useDetectedWallets({ families: ['evm'] }));
    const b = renderHook(() => useDetectedWallets({ families: ['evm'] }));

    await waitFor(() => expect(a.result.current.ready).toBe(true));
    await waitFor(() => expect(b.result.current.ready).toBe(true));

    expect(a.result.current.wallets[0]).toBe(b.result.current.wallets[0]);

    a.unmount();
    b.unmount();
  });
});
