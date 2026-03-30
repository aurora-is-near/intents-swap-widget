/* eslint-disable import/order, jest-formatting/padding-around-all, padding-line-between-statements */

// import mocks first
import {
  mockAlchemyApi,
  mockFeeServiceApi,
  mockOneClickApi,
} from '../../tests/mock-axios-requests';
import '../../tests/mock-qr-code';
import { mockEvmWallet } from '../../tests/mock-evm-wallet';
import { mockMakeTransfer } from '../../tests/mock-make-transfer';
import { mockAlchemyResponse } from '../../tests/mock-alchemy-response';
import { mockGetIntentsBalances } from '../../tests/mock-get-intents-balances';
import { mockConnectedWalletAddress } from '../../tests/mock-connected-wallet-address';
import { getMockPendingDepositStatus } from '../../tests/mock-quote';
import { mockOneClickQuote } from '../../tests/mock-one-click-quote';
import { mockedLocalStorage } from '../../tests/mock-localstorage';
import { mockOneClickSDK } from '../../tests/mock-one-click-sdk';

import { setup } from '../../tests/setup';
import { CtxDebugger } from '../../tests/ctx';

// then import the rest
import { jest } from '@jest/globals';
import { TokenResponse } from '@defuse-protocol/one-click-sdk-typescript';

import { WidgetConfig } from '../../types/config';
import { WidgetConfigProvider } from '../../config';
import { EVM_CHAINS } from '../../constants/chains';
import { CHAINS_MAP } from '../../ext/alchemy/types';
import { formatHumanToBig } from '../../utils/formatters/formatHumanToBig';

import { WidgetDeposit } from '.';

jest.useFakeTimers();

const WidgetDepositSetup = () => {
  const config: Partial<WidgetConfig> = {
    appName: 'Test',
    appIcon: '/test-icon.png',
    apiKey: 'test-api-key',
    enableAccountAbstraction: true,
    alchemyApiKey: 'test-alchemy-api-key',
    connectedWallets: { default: mockConnectedWalletAddress('evm') },
    walletSupportedChains: EVM_CHAINS,
    providers: { evm: mockEvmWallet },
  };

  return (
    <WidgetConfigProvider
      config={config}
      theme={undefined}
      balanceViaRpc={false}
      localisation={undefined}>
      <WidgetDeposit isLoading={false} makeTransfer={mockMakeTransfer} />
      <CtxDebugger isEnabled={false} />
    </WidgetConfigProvider>
  );
};

const sourceToken = {
  symbol: 'ETH',
  assetId: 'nep141:eth.bridge.near',
  contractAddress: 'eth.bridge.near',
  priceUpdatedAt: '2025-11-26T15:32:00.248Z',
  blockchain: TokenResponse.blockchain.NEAR,
  price: 2936.23,
  decimals: 18,
} satisfies TokenResponse;

const targetToken = {
  assetId: 'nep141:eth.omft.near',
  priceUpdatedAt: '2025-11-26T15:32:00.248Z',
  blockchain: TokenResponse.blockchain.ETH,
  symbol: 'ETH',
  price: 2936.23,
  decimals: 18,
} satisfies TokenResponse;

describe('Deposit', () => {
  beforeEach(() => {
    mockedLocalStorage.setItem(
      'sw.verifiedWallets',
      JSON.stringify([mockConnectedWalletAddress('evm')]),
    );

    mockGetIntentsBalances.mockResolvedValue({
      'nep141:eth.bridge.near': 0,
      'nep141:eth.omft.near': 0,
    });

    mockAlchemyApi.post.mockResolvedValue(
      mockAlchemyResponse([
        {
          tokenAddress: null,
          network: CHAINS_MAP.eth,
          tokenBalance: formatHumanToBig('1', sourceToken.decimals),
        },
      ]),
    );

    const quoteMock = mockOneClickQuote({
      sourceToken,
      targetToken,
      amount: formatHumanToBig('2', sourceToken.decimals),
      recipient: mockConnectedWalletAddress('evm'),
    });

    mockOneClickSDK.getQuote.mockResolvedValue(quoteMock);
    mockOneClickSDK.getTokens.mockResolvedValue([sourceToken, targetToken]);
    mockOneClickSDK.getExecutionStatus.mockResolvedValue(
      getMockPendingDepositStatus(quoteMock),
    );

    mockOneClickApi.post.mockResolvedValue({ data: quoteMock });
    mockFeeServiceApi.post.mockResolvedValue({ data: quoteMock });
    mockFeeServiceApi.get.mockResolvedValue({
      data: { asset_stats: [], tokens: [sourceToken, targetToken] },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('renders deposit widget layout', async () => {
    const { screen, within, user, container } = setup(<WidgetDepositSetup />);

    // 1. Input initial state
    const tokenInput = await screen.findByLabelText('Sell');
    const inputAmount = within(tokenInput).getByPlaceholderText('0');
    expect(inputAmount).toBeInTheDocument();
    expect(inputAmount).not.toHaveFocus();
    expect(inputAmount).toHaveValue('');
    expect(inputAmount).toBeEnabled();

    // 2. Tokens are fetched via fee service (apiKey is set in test config)
    expect(mockFeeServiceApi.get).toHaveBeenCalled();

    // 3. Toggle QR code
    const depositMethodLabel = screen.getByText('Deposit from external wallet');
    expect(depositMethodLabel).toBeInTheDocument();

    const toggleContainer = depositMethodLabel.parentElement;
    expect(toggleContainer).toBeInTheDocument();

    const qrToggle = within(toggleContainer!).getByRole('switch');
    expect(qrToggle).not.toBeChecked();
    await user.click(qrToggle);

    // 4. Make a quote
    expect(qrToggle).toBeChecked();
    expect(screen.getByRole('button', { name: 'ETH' })).toBeInTheDocument();
    expect(screen.getByText('Minimum deposit 0.00034 ETH')).toBeInTheDocument();
    expect(screen.getByText('Use Ethereum network')).toBeInTheDocument();
    const qrImg = screen.getByRole('img', { name: 'qr-code' });

    expect(qrImg).toBeInTheDocument();
    expect(qrImg).toHaveAttribute('data-value', 'test-deposit-address');
    expect(screen.getByText('test-dep...ddress')).toBeInTheDocument();
    expect(screen.getByText('Waiting for transaction')).toBeInTheDocument();
  });
});
