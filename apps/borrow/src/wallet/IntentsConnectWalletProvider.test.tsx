import { createIntentsApi } from '@aurora-is-near/intents-connect';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IntentsConnectWalletProvider } from './IntentsConnectWalletProvider';

const mocks = vi.hoisted(() => ({
  api: { name: 'borrow-api' },
  wallet: null as object | null,
  providerProps: [] as Array<Record<string, unknown>>,
}));

vi.mock('../config', () => ({ intentsConnectApi: mocks.api }));

vi.mock('@aurora-is-near/intents-connect-wallet/connect/appkit', () => ({
  useIntentsConnectWallet: () => ({ wallet: mocks.wallet }),
}));

vi.mock('@aurora-is-near/intents-connect/react', () => ({
  IntentsConnectProvider: ({
    children,
    ...props
  }: Record<string, unknown> & { children: ReactNode }) => {
    mocks.providerProps.push(props);

    return children;
  },
}));

describe('IntentsConnectWalletProvider', () => {
  beforeEach(() => {
    mocks.providerProps.length = 0;
  });

  it('passes the app API client and a null wallet while disconnected', () => {
    mocks.wallet = null;

    render(
      <IntentsConnectWalletProvider>
        <p>app</p>
      </IntentsConnectWalletProvider>,
    );

    expect(screen.getByText('app')).toBeInTheDocument();
    expect(mocks.providerProps.at(-1)).toEqual({
      api: mocks.api,
      // The borrow flow cancels a declined signature itself, explaining it.
      autoCancelOnSignatureRejection: false,
      wallet: null,
    });
  });

  it('passes the intents API client when given, for the account hooks', () => {
    const intentsApi = createIntentsApi({ apiKey: 'borrow-key' });

    mocks.wallet = null;

    render(
      <IntentsConnectWalletProvider intentsApi={intentsApi}>
        <p>app</p>
      </IntentsConnectWalletProvider>,
    );

    expect(mocks.providerProps.at(-1)?.intentsApi).toBe(intentsApi);
  });

  it('passes the connected wallet from useIntentsConnectWallet', () => {
    const wallet = { family: 'evm', address: '0x7a3f' };

    mocks.wallet = wallet;

    render(
      <IntentsConnectWalletProvider>
        <p>app</p>
      </IntentsConnectWalletProvider>,
    );

    expect(mocks.providerProps.at(-1)?.wallet).toBe(wallet);
  });
});
