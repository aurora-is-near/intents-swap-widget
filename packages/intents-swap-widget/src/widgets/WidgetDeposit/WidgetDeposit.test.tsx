/* eslint-disable import/order, jest-formatting/padding-around-all, padding-line-between-statements */

// import mocks first
import {
  mockAlchemyApi,
  mockOneClickApi,
} from '../../tests/mock-axios-requests';
import { mockEvmWallet } from '../../tests/mock-evm-wallet';
import { mockMakeTransfer } from '../../tests/mock-make-transfer';
import { mockAlchemyResponse } from '../../tests/mock-alchemy-response';
import { mockGetIntentsBalances } from '../../tests/mock-get-intents-balances';
import { mockConnectedWalletAddress } from '../../tests/mock-connected-wallet-address';
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
    mockOneClickApi.post.mockResolvedValue({ data: quoteMock });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('renders deposit widget layout', async () => {
    const { screen, within } = setup(<WidgetDepositSetup />);

    // 1. Input initial state
    const tokenInput = await screen.findByLabelText('Sell');
    const inputAmount = within(tokenInput).getByPlaceholderText('0');
    expect(inputAmount).toBeInTheDocument();
    expect(inputAmount).not.toHaveFocus();
    expect(inputAmount).toHaveValue('');
    expect(inputAmount).toBeEnabled();

    // 2. Tokens are fetched
    expect(mockOneClickSDK.getTokens).toHaveBeenCalled();

    // 3. Deposit selector
    const depositMethodLabel = screen.getByText('Select deposit method');
    expect(depositMethodLabel).toBeInTheDocument();

    const myWalletBtn = screen.getByRole('button', { name: 'My wallet' });
    expect(myWalletBtn).toHaveAttribute('data-active');
    expect(myWalletBtn).toBeInTheDocument();
    expect(myWalletBtn).toBeEnabled();

    const qrCodeBtn = screen.getByRole('button', { name: 'QR / Address' });
    expect(qrCodeBtn).not.toHaveAttribute('data-active');
    expect(qrCodeBtn).toBeInTheDocument();
    expect(qrCodeBtn).toBeEnabled();

    // 4. Submit button
    const submitBtn = screen.getByRole('button', { name: 'Enter amount' });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    // 5. Selected asset
    const selectedAsset = within(tokenInput).getByRole('button');
    expect(selectedAsset).toHaveTextContent('ETH');
  });

  it('insufficient balance', async () => {
    const { screen, user, within } = setup(<WidgetDepositSetup />);

    const tokenInput = await screen.findByLabelText('Sell');
    const inputAmount = within(tokenInput).getByPlaceholderText('0');

    await user.type(inputAmount, '2');

    const submitBtn = screen.getByRole('button', {
      name: 'Insufficient balance',
    });

    expect(mockOneClickApi.post).toHaveBeenCalled();
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
  });
});
