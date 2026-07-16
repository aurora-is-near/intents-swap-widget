import { createElement } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { SimpleToken } from '@/types/token';
import type { WidgetConfig } from '@/types/config';

import { useTokens } from './useTokens';

// Mock only the network boundary and the config, so the real filtering pipeline
// runs against the actual react-query wiring.
const mockUseConfig = jest.fn();

let mockTokens: SimpleToken[] = [];

jest.mock('@/config', () => ({ useConfig: () => mockUseConfig() }));
jest.mock('@/utils/feeServiceTokens', () => ({
  FEE_SERVICE_TOKENS_QUERY_KEY: 'fee-service-tokens',
  fetchFeeServiceTokens: jest.fn(() =>
    Promise.resolve({ assetStats: [], tokens: mockTokens }),
  ),
}));

const makeToken = (overrides: Partial<SimpleToken>): SimpleToken => ({
  assetId: 'nep141:usdt.near',
  symbol: 'USDT',
  decimals: 6,
  price: 1,
  blockchain: 'near',
  icon: '',
  contractAddress: 'usdt.near',
  ...overrides,
});

const usdtToken = makeToken({});
const ethToken = makeToken({
  assetId: 'nep141:eth.omft.near',
  symbol: 'ETH',
  blockchain: 'eth',
  decimals: 18,
});

const setConfig = (config: Partial<WidgetConfig>) => {
  mockUseConfig.mockReturnValue({
    apiKey: 'test-api-key',
    enableAccountAbstraction: false,
    ...config,
  });
};

const renderTokens = (options?: { unrestricted?: boolean }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return renderHook(() => useTokens({ variant: 'source', ...options }), {
    wrapper: ({ children }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  });
};

describe('useTokens', () => {
  beforeEach(() => {
    mockTokens = [usdtToken, ethToken];
    setConfig({});
  });

  describe('by default', () => {
    it('applies allowedTokensList', async () => {
      setConfig({ allowedTokensList: ['USDT'] });

      const { result } = renderTokens();

      await waitFor(() => expect(result.current.tokens).toHaveLength(1));

      expect(result.current.tokens[0]?.symbol).toBe('USDT');
    });

    it('applies filterTokens', async () => {
      setConfig({ filterTokens: (token) => token.symbol !== 'ETH' });

      const { result } = renderTokens();

      await waitFor(() => expect(result.current.tokens).toHaveLength(1));

      expect(result.current.tokens[0]?.symbol).toBe('USDT');
    });

    it('omits intents tokens when account abstraction is disabled', async () => {
      const { result } = renderTokens();

      await waitFor(() => expect(result.current.tokens).not.toHaveLength(0));

      expect(result.current.tokens.some((t) => t.isIntent)).toBe(false);
    });
  });

  // The transaction history resolves tokens for transactions that already
  // happened, so reconfiguring what the widget offers must not retroactively
  // make those tokens unresolvable (which renders the row blank).
  describe('when unrestricted', () => {
    it('ignores allowedTokensList', async () => {
      setConfig({ allowedTokensList: ['USDT'] });

      const { result } = renderTokens({ unrestricted: true });

      await waitFor(() => expect(result.current.tokens).not.toHaveLength(0));

      expect(result.current.tokens.map((t) => t.symbol)).toEqual(
        expect.arrayContaining(['USDT', 'ETH']),
      );
    });

    it('ignores filterTokens', async () => {
      setConfig({ filterTokens: (token) => token.symbol !== 'ETH' });

      const { result } = renderTokens({ unrestricted: true });

      await waitFor(() => expect(result.current.tokens).not.toHaveLength(0));

      expect(result.current.tokens.some((t) => t.symbol === 'ETH')).toBe(true);
    });

    it('keeps intents tokens when account abstraction is disabled', async () => {
      setConfig({ enableAccountAbstraction: false });

      const { result } = renderTokens({ unrestricted: true });

      await waitFor(() => expect(result.current.tokens).not.toHaveLength(0));

      expect(result.current.tokens.some((t) => t.isIntent)).toBe(true);
    });

    it('ignores disabledInternalBalanceTokens for intents tokens', async () => {
      setConfig({ disabledInternalBalanceTokens: ['ETH'] });

      const { result } = renderTokens({ unrestricted: true });

      await waitFor(() => expect(result.current.tokens).not.toHaveLength(0));

      expect(
        result.current.tokens.some((t) => t.isIntent && t.symbol === 'ETH'),
      ).toBe(true);
    });
  });
});
