/* eslint-disable import/order, jest-formatting/padding-around-all, padding-line-between-statements */

// import mocks first
import {
  mockAlchemyApi,
  mockFeeServiceApi,
} from '../../tests/mock-axios-requests';
import { mockEvmWallet } from '../../tests/mock-evm-wallet';
import { mockAlchemyResponse } from '../../tests/mock-alchemy-response';
import { mockGetIntentsBalances } from '../../tests/mock-get-intents-balances';
import { mockConnectedWalletAddress } from '../../tests/mock-connected-wallet-address';
import { mockedLocalStorage } from '../../tests/mock-localstorage';

import { setup } from '../../tests/setup';
import { CtxDebugger } from '../../tests/ctx';

// then import the rest
import { jest } from '@jest/globals';
import { AxiosError, type AxiosResponse } from 'axios';
import { waitFor } from '@testing-library/react';
import { TokenResponse } from '@defuse-protocol/one-click-sdk-typescript';

import { WidgetConfig } from '../../types/config';
import { WidgetConfigProvider } from '../../config';
import { EVM_CHAINS } from '../../constants/chains';
import { CHAINS_MAP } from '../../ext/alchemy/types';
import { formatHumanToBig } from '../../utils/formatters/formatHumanToBig';

import { WidgetSwap } from '.';

jest.useFakeTimers();

const sourceToken = {
  assetId: 'nep141:eth.omft.near',
  priceUpdatedAt: '2025-11-26T15:32:00.248Z',
  blockchain: TokenResponse.blockchain.ETH,
  symbol: 'ETH',
  price: 2936.23,
  decimals: 18,
} satisfies TokenResponse;

const targetToken = {
  assetId: 'nep141:arb.omft.near',
  priceUpdatedAt: '2025-11-26T15:32:00.248Z',
  blockchain: TokenResponse.blockchain.ARB,
  symbol: 'ETH',
  price: 2936.23,
  decimals: 18,
} satisfies TokenResponse;

const quoteFailure = (message: string) =>
  new AxiosError(message, 'ERR_BAD_RESPONSE', undefined, undefined, {
    status: 500,
    statusText: 'Internal Server Error',
    data: { message },
    headers: {},
    config: {},
  } as AxiosResponse);

// Incidents load once per API key and stay cached for the module's lifetime,
// so each test uses its own key.
const WidgetSwapSetup = ({ apiKey }: { apiKey: string }) => {
  const config: Partial<WidgetConfig> = {
    apiKey,
    alchemyApiKey: 'test-alchemy-api-key',
    connectedWallets: { default: mockConnectedWalletAddress('evm') },
    walletSupportedChains: EVM_CHAINS,
    providers: { evm: mockEvmWallet },
    defaultSourceToken: { symbol: 'ETH', blockchain: 'eth' },
    defaultTargetToken: { symbol: 'ETH', blockchain: 'arb' },
  };

  return (
    <WidgetConfigProvider config={config} balanceViaRpc={false}>
      <WidgetSwap isLoading={false} />
      <CtxDebugger isEnabled={false} />
    </WidgetConfigProvider>
  );
};

const mockFeeService = (incidents: unknown) => {
  mockFeeServiceApi.get.mockImplementation(async (url: string) => {
    if (url.startsWith('/api/incidents/')) {
      return { data: incidents };
    }

    return { data: { asset_stats: [], tokens: [sourceToken, targetToken] } };
  });
};

const failQuote = async (apiKey: string, message: string) => {
  mockFeeServiceApi.post.mockRejectedValue(quoteFailure(message));

  const { screen, within, user } = setup(<WidgetSwapSetup apiKey={apiKey} />);

  const sell = await screen.findByLabelText('Sell');
  const amount = within(sell).getByPlaceholderText('0');

  await user.type(amount, '0.5');

  return { screen, user, amount };
};

describe('Swap quote failures and chain incidents', () => {
  beforeEach(() => {
    mockedLocalStorage.setItem(
      'sw.verifiedWallets',
      JSON.stringify([mockConnectedWalletAddress('evm')]),
    );

    mockGetIntentsBalances.mockResolvedValue({});

    mockAlchemyApi.post.mockResolvedValue(
      mockAlchemyResponse([
        {
          tokenAddress: null,
          network: CHAINS_MAP.eth,
          tokenBalance: formatHumanToBig('1', sourceToken.decimals),
        },
      ]),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('explains an unknown failure with a deposit pause on the source chain', async () => {
    mockFeeService({
      status: 'incidents',
      incidents: [
        { scopeType: 'chain', scopeValue: 'eth', direction: 'deposit' },
      ],
      maintenance: [],
    });

    const { screen } = await failQuote('key-incident', 'Internal server error');

    expect(
      await screen.findByRole('button', { name: 'Pair not available' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'status page' })).toHaveAttribute(
      'href',
      'https://partners.near-intents.org/shield/status',
    );
  });

  it('stays loading until incidents arrive, then explains the failure', async () => {
    let resolveIncidents: (value: { data: unknown }) => void = () => {};

    mockFeeServiceApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/api/incidents/')) {
        return new Promise((resolve) => {
          resolveIncidents = resolve;
        });
      }

      return Promise.resolve({
        data: { asset_stats: [], tokens: [sourceToken, targetToken] },
      });
    });

    const { screen } = await failQuote('key-slow', 'Internal server error');

    await waitFor(() => expect(mockFeeServiceApi.post).toHaveBeenCalled());
    await jest.advanceTimersByTimeAsync(1000);

    expect(
      screen.getByRole('button', { name: 'Finalizing quote' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Quote failed' }),
    ).not.toBeInTheDocument();

    resolveIncidents({
      data: {
        status: 'incidents',
        incidents: [
          { scopeType: 'chain', scopeValue: 'arb', direction: 'withdraw' },
        ],
        maintenance: [],
      },
    });

    expect(
      await screen.findByRole('button', { name: 'Pair not available' }),
    ).toBeInTheDocument();
  });

  it('shows the quote error when no incident covers either chain', async () => {
    mockFeeService({
      status: 'incidents',
      incidents: [
        { scopeType: 'chain', scopeValue: 'btc', direction: '*' },
        // the source only deposits, so a withdrawal pause there is irrelevant
        { scopeType: 'chain', scopeValue: 'eth', direction: 'withdraw' },
      ],
      maintenance: [],
    });

    const { screen } = await failQuote('key-no-match', 'Internal server error');

    expect(
      await screen.findByRole('button', { name: 'Quote failed' }),
    ).toBeInTheDocument();
  });

  it('keeps a recognised error message without checking incidents', async () => {
    mockFeeService({
      status: 'incidents',
      incidents: [{ scopeType: 'chain', scopeValue: 'eth', direction: '*' }],
      maintenance: [],
    });

    const { screen } = await failQuote(
      'key-known',
      'Amount is too low for bridge, try at least 1000000000000000000',
    );

    expect(
      await screen.findByRole('button', { name: 'Amount is too low' }),
    ).toBeInTheDocument();
  });

  it('loads incidents once, however many quotes fail', async () => {
    mockFeeService({ status: 'operational', maintenance: [] });

    const { screen, user, amount } = await failQuote(
      'key-once',
      'Internal server error',
    );

    await screen.findByRole('button', { name: 'Quote failed' });

    // A new amount asks for a new quote, which fails again.
    const quotesBefore = mockFeeServiceApi.post.mock.calls.length;

    await user.type(amount, '5');
    await waitFor(() =>
      expect(mockFeeServiceApi.post.mock.calls.length).toBeGreaterThan(
        quotesBefore,
      ),
    );
    await screen.findByRole('button', { name: 'Quote failed' });

    const incidentCalls = mockFeeServiceApi.get.mock.calls.filter(([url]) =>
      url.startsWith('/api/incidents/'),
    );

    expect(incidentCalls).toEqual([['/api/incidents/key-once']]);
  });
});
