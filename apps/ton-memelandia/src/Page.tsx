/* eslint-disable no-console */
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Cell } from '@ton/core';
import * as Icons from 'lucide-react';
import {
  Blockchain,
  GaslessSettlement,
  Omniston,
  Quote as OmnistonQuote,
  SettlementMethod,
} from '@ston-fi/omniston-sdk';
import {
  GetExecutionStatusResponse,
  OneClickService,
  OpenAPI,
} from '@defuse-protocol/one-click-sdk-typescript';
import { useMemo, useRef, useState } from 'react';
import {
  Button,
  Chains,
  MakeTransferArgs,
  SimpleToken,
  SuccessScreen,
  SwapCard,
  useMakeEvmTransfer,
  WidgetConfig,
  WidgetConfigProvider,
  WidgetContainer,
  WidgetSwap,
} from '@aurora-is-near/intents-swap-widget';
import { formatBigToHuman } from '@aurora-is-near/intents-swap-widget/utils';
import clsx from 'clsx';
import { useAppKitWallet } from './hooks/useAppKitWallet';
import { useTonWallet } from './hooks/useTonWallet';
import { WalletConnectionCard } from './components/WalletConnectionCard';
import { Heading } from './components/Heading';

type SwapStatus = 'not-started' | 'in-progress' | 'completed' | 'failed';

type SwapDetails = {
  status: SwapStatus;
  source: {
    assetId: string;
    amount: string;
  };
  target: {
    assetId: string;
    amount: string;
  };
  swapType: 'oneclick' | 'omniston';
  swapButtonText: string;
};

const TON_ASSET_ID = 'nep245:v2_1.omni.hot.tg:1117_';
const TON_ASSET_ADDRESS = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';
const TARGET_ASSET_ADDRESSES = [
  'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO',
  'EQBX6K9aXVl3nXINCyPPL86C4ONVmQ8vK360u6dykFKXpHCa',
];

const SLIPPAGE_TOLERANCE = 500; // 5%
const REFETCH_QUOTE_INTERVAL = 10_000; // 10 seconds

OpenAPI.BASE = 'https://1click.chaindefuser.com';

const omniston = new Omniston({
  apiUrl: 'wss://omni-ws.ston.fi',
});

/**
 * Fetch the details of the given assets from the STON.fi API.
 */
const fetchStonFiAssets = async (assets: string[]): Promise<SimpleToken[]> => {
  const res = await fetch('https://api.ston.fi/v1/assets/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      unconditional_assets: assets,
    }),
  });

  const data = (await res.json()) as {
    asset_list: {
      contract_address: string;
      kind: string;
      dex_price_usd: string;
      meta: {
        symbol: string;
        display_name: string;
        image_url: string;
        decimals: number;
      };
    }[];
  };

  return data.asset_list
    .filter((asset) => assets.includes(asset.contract_address))
    .map((asset) => ({
      symbol: asset.meta.symbol,
      price: parseFloat(asset.dex_price_usd),
      blockchain: 'ton',
      assetId: asset.contract_address,
      decimals: asset.meta.decimals,
      contractAddress: asset.contract_address,
    }));
};

/**
 * Fetch the available target tokens.
 */
const fetchTargetTokens: WidgetConfig['fetchTargetTokens'] = async () =>
  fetchStonFiAssets(TARGET_ASSET_ADDRESSES);

const performOmnistoneSwap = async (
  omnistonQuote: OmnistonQuote,
  tonAddress: string,
  tonConnect: ReturnType<typeof useTonConnectUI>[0],
) => {
  if (!omnistonQuote) {
    throw new Error('Missing Omniston quote');
  }

  const tx = await omniston.buildTransfer({
    quote: omnistonQuote,
    useRecommendedSlippage: true,
    sourceAddress: {
      blockchain: Blockchain.TON,
      address: tonAddress,
    },
    destinationAddress: {
      blockchain: Blockchain.TON,
      address: tonAddress,
    },
  });

  const messages = tx.ton?.messages ?? [];

  const sendTxRes = await tonConnect.sendTransaction({
    validUntil: Date.now() + 1000000,
    messages: messages.map((message) => ({
      address: message.targetAddress,
      amount: message.sendAmount,
      payload: message.payload,
    })),
  });

  const externalTxHash = Cell.fromBase64(sendTxRes.boc).hash().toString('hex');

  const response = await fetch(`https://tonapi.io/v2/traces/${externalTxHash}`);
  const data = await response.json();

  if (data.error) {
    throw new Error(`Failed to fetch Omniston transaction: ${data.error}`);
  }

  const omnistonTxHash: string = data.transaction.hash;

  return omnistonTxHash;
};

/**
 * Wait for the Omniston transfer to be settled.
 */
const waitForOmnistonSettlement = (
  quoteId: string,
  outgoingTxHash: string,
  tonAddress: string,
) => {
  const tradeStatus = omniston.trackTrade({
    quoteId,
    traderWalletAddress: {
      blockchain: Blockchain.TON,
      address: tonAddress,
    },
    outgoingTxHash,
  });

  return new Promise((resolve) => {
    tradeStatus.subscribe(({ status }) => {
      if (status?.tradeSettled) {
        resolve(null);
      }
    });
  });
};

/**
 * Wait for the OneClick transfer to be settled.
 */
const waitForOneClickSettlement = async (
  oneClickDepositAddress: string,
): Promise<GetExecutionStatusResponse> => {
  const res = await OneClickService.getExecutionStatus(oneClickDepositAddress);

  if (res.status === GetExecutionStatusResponse.status.SUCCESS) {
    return res;
  }

  if (res.status === GetExecutionStatusResponse.status.FAILED) {
    throw new Error('OneClick transfer failed');
  }

  await new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });

  return waitForOneClickSettlement(oneClickDepositAddress);
};

const getOneClickSwapDetails = ({
  sourceAsset,
  sourceAmount,
  targetAmount,
}: {
  sourceAsset: string;
  sourceAmount: string;
  targetAmount: string;
}): SwapDetails => {
  return {
    status: 'not-started',
    source: {
      assetId: sourceAsset,
      amount: sourceAmount,
    },
    target: {
      assetId: TON_ASSET_ID,
      amount: targetAmount,
    },
    swapType: 'oneclick',
    swapButtonText: 'Confirm in source wallet',
  };
};

const getOmnistonSwapDetails = ({
  sourceAmount,
  targetAmount,
  destinationAsset,
}: {
  destinationAsset: string;
  sourceAmount: string;
  targetAmount: string;
}): SwapDetails => {
  return {
    status: 'not-started',
    source: {
      assetId: TON_ASSET_ID,
      amount: sourceAmount,
    },
    target: {
      assetId: destinationAsset,
      amount: targetAmount,
    },
    swapType: 'omniston',
    swapButtonText: 'Confirm in TON wallet',
  };
};

const findTokenByAssetId = (
  tokens: SimpleToken[],
  assetId: string,
): SimpleToken => {
  const token = tokens.find((t) => t.assetId === assetId);

  if (!token) {
    throw new Error(`Token not found for assetId: ${assetId}`);
  }

  return token;
};

export const Page = () => {
  const {
    address: appKitWalletAddress,
    chainType,
    isConnecting: isAppKitConnecting,
  } = useAppKitWallet();

  const { address: tonAddress, isConnecting: isTonConnecting } = useTonWallet();
  const [tonConnect] = useTonConnectUI();
  const omnistonQuote = useRef<OmnistonQuote>(null);
  const { make: makeEvmTransfer } = useMakeEvmTransfer();
  const [isTokensModalOpen, setIsTokensModalOpen] = useState(false);
  const [makeTransferArgs, setMakeTransferArgs] =
    useState<MakeTransferArgs | null>(null);

  const [selectedToken, setSelectedToken] = useState<SimpleToken | null>(null);
  const [swaps, setSwaps] = useState<SwapDetails[]>([]);

  const [successfulTransactionDetails, setSuccessfulTransactionDetails] =
    useState<{
      hash: string;
      transactionLink: string;
    } | null>();

  const updateSwapStatus = (index: number, status: SwapStatus) => {
    setSwaps((prev): SwapDetails[] => {
      if (!prev) {
        return prev;
      }

      if (!prev[index]) {
        throw new Error(`Invalid swap index: ${index}`);
      }

      prev[index].status = status;

      return [...prev];
    });
  };

  const resetSwapState = () => {
    setSuccessfulTransactionDetails(null);
    setMakeTransferArgs(null);
    setSwaps([]);
  };

  const confirmOneClickSwap = async (args: MakeTransferArgs) => {
    updateSwapStatus(0, 'in-progress');

    try {
      await makeEvmTransfer(args);
      await waitForOneClickSettlement(args.address);
    } catch (error) {
      updateSwapStatus(0, 'failed');
      console.error('One Click swap failed:', error);

      return;
    }

    updateSwapStatus(0, 'completed');
  };

  const confirmOmnistonSwap = async () => {
    if (!omnistonQuote.current) {
      throw new Error('Missing Omniston quote');
    }

    updateSwapStatus(1, 'in-progress');

    let omnistonTxHash: string;

    try {
      omnistonTxHash = await performOmnistoneSwap(
        omnistonQuote.current,
        tonAddress,
        tonConnect,
      );

      await waitForOmnistonSettlement(
        omnistonQuote.current.quoteId,
        omnistonTxHash,
        tonAddress,
      );
    } catch (error) {
      updateSwapStatus(1, 'failed');
      console.error('Omniston swap failed:', error);

      return;
    }

    updateSwapStatus(1, 'completed');
    setSuccessfulTransactionDetails({
      hash: omnistonTxHash,
      transactionLink: `https://tonviewer.com/transaction/${omnistonTxHash}`,
    });
  };

  const fetchOmnistonQuote = async (
    destinationAsset: string,
    bidAmount: string,
  ) => {
    // Request the second quote, to see how much of the target asset we can get
    // for the TON we received from OneClick. The quote is stored for later use
    // when performing the swap.
    omnistonQuote.current = await new Promise<OmnistonQuote>((resolve) => {
      omniston
        .requestForQuote({
          settlementMethods: [SettlementMethod.SETTLEMENT_METHOD_SWAP],
          askAssetAddress: {
            blockchain: Blockchain.TON,
            address: destinationAsset,
          },
          bidAssetAddress: {
            blockchain: Blockchain.TON,
            address: TON_ASSET_ADDRESS,
          },
          amount: {
            bidUnits: bidAmount,
          },
          settlementParams: {
            gaslessSettlement: GaslessSettlement.GASLESS_SETTLEMENT_POSSIBLE,
            maxPriceSlippageBps: SLIPPAGE_TOLERANCE,
          },
        })
        .subscribe((quoteResponseEvent) => {
          if (
            quoteResponseEvent.type === 'quoteUpdated' &&
            'quote' in quoteResponseEvent
          ) {
            resolve(quoteResponseEvent.quote);

            return;
          }
        });
    });

    return omnistonQuote.current;
  };

  /**
   * Fetch a two-step quote.
   *
   * The first quote is done via OneClick, from the selected source asset to TON.
   * The second quote is done via Omniston, from TON to the selected target asset.
   */
  const fetchDoubleQuote: WidgetConfig['fetchQuote'] = async (data) => {
    const [{ quote: oneClickQuote }, tokens] = await Promise.all([
      OneClickService.getQuote({
        ...data,
        destinationAsset: TON_ASSET_ID,
        slippageTolerance: SLIPPAGE_TOLERANCE,
      }),
      fetchStonFiAssets([data.destinationAsset]),
    ]);

    // Request the second quote, to see how much of the target asset we can get
    // for the TON we received from OneClick. The quote is stored for later use
    // when performing the swap.
    const { askUnits, params } = await fetchOmnistonQuote(
      data.destinationAsset,
      oneClickQuote.amountOut,
    );

    const targetToken = findTokenByAssetId(tokens, data.destinationAsset);

    const minAskAmount = params?.swap?.minAskAmount ?? askUnits;
    const amountOutHuman = parseFloat(
      formatBigToHuman(askUnits, targetToken.decimals),
    );

    const amountOutUsd = amountOutHuman * targetToken.price;
    const quoteResponse = {
      deadline: oneClickQuote.deadline,
      depositAddress: oneClickQuote.depositAddress,
      timeEstimate: oneClickQuote.timeEstimate,
      amountIn: oneClickQuote.amountIn,
      amountInFormatted: oneClickQuote.amountInFormatted,
      amountInUsd: oneClickQuote.amountInUsd,
      minAmountIn: oneClickQuote.minAmountIn,
      amountOut: askUnits,
      amountOutFormatted: String(amountOutHuman),
      amountOutUsd: String(amountOutUsd),
      minAmountOut: minAskAmount,
    };

    setSwaps([
      getOneClickSwapDetails({
        sourceAsset: data.originAsset,
        sourceAmount: quoteResponse.amountIn,
        targetAmount: oneClickQuote.amountOut,
      }),
      getOmnistonSwapDetails({
        destinationAsset: data.destinationAsset,
        sourceAmount: oneClickQuote.amountOut,
        targetAmount: quoteResponse.amountOut,
      }),
    ]);

    return quoteResponse;
  };

  /**
   * Fetch a TON-only quote.
   */
  const fetchTonOnlyQuote: WidgetConfig['fetchQuote'] = async (data) => {
    const [{ bidUnits, askUnits, params, quoteTimestamp }, tokens] =
      await Promise.all([
        fetchOmnistonQuote(data.destinationAsset, data.amount),
        fetchStonFiAssets([data.destinationAsset, TON_ASSET_ADDRESS]),
      ]);

    const sourceToken = findTokenByAssetId(tokens, TON_ASSET_ADDRESS);
    const targetToken = findTokenByAssetId(tokens, data.destinationAsset);

    const minAskAmount = params?.swap?.minAskAmount ?? askUnits;
    const amountOutHuman = parseFloat(
      formatBigToHuman(askUnits, targetToken.decimals),
    );

    const amountOutUsd = amountOutHuman * targetToken.price;

    const amountInHuman = parseFloat(
      formatBigToHuman(bidUnits, sourceToken.decimals),
    );

    const amountInUsd = amountInHuman * sourceToken.price;

    const quoteResponse = {
      depositAddress: data.recipient,
      timeEstimate: quoteTimestamp,
      amountIn: bidUnits,
      amountInFormatted: String(amountInHuman),
      amountInUsd: String(amountInUsd),
      minAmountIn: bidUnits,
      amountOut: askUnits,
      amountOutFormatted: String(amountOutHuman),
      amountOutUsd: String(amountOutUsd),
      minAmountOut: minAskAmount,
    };

    setSwaps([
      getOmnistonSwapDetails({
        destinationAsset: data.destinationAsset,
        sourceAmount: bidUnits,
        targetAmount: askUnits,
      }),
    ]);

    return quoteResponse;
  };

  /**
   * Fetch a quote.
   *
   * If we are swapping from TON to one of the target memecoins we only need a
   * single quote via Omniston. Otherwise, we need to do a two-step quote via
   * OneClick and then Omniston.
   */
  const fetchQuote: WidgetConfig['fetchQuote'] = (data) => {
    if (data.originAsset === TON_ASSET_ID) {
      return fetchTonOnlyQuote(data);
    }

    return fetchDoubleQuote(data);
  };

  const makeTransfer = (args: MakeTransferArgs) => {
    setMakeTransferArgs(args);
  };

  const walletSupportedChains = useMemo(() => {
    const chains: Chains[] = ['ton'];

    if (chainType === 'evm') {
      chains.push('eth', 'arb', 'pol', 'bsc', 'op', 'avax', 'base');
    }

    if (chainType === 'solana') {
      chains.push('sol');
    }

    // Default to 'near' if no wallets connected
    if (chains.length === 0) {
      chains.push('near');
    }

    return chains;
  }, [chainType]);

  const intentsAccountType = useMemo(() => {
    if (chainType === 'evm') {
      return 'evm';
    }

    if (chainType === 'solana') {
      return 'sol';
    }

    return 'near';
  }, [chainType]);

  const isSwapInProgress = !!swaps.find(
    (swap) => swap.status === 'in-progress',
  );

  const walletAddress = useMemo(() => {
    if (!appKitWalletAddress || !tonAddress) {
      return undefined;
    }

    if (selectedToken?.blockchain === 'ton') {
      return tonAddress;
    }

    return appKitWalletAddress;
  }, [appKitWalletAddress, tonAddress, selectedToken]);

  const nextSwap = swaps.find((swap) => swap.status !== 'completed');

  if (successfulTransactionDetails) {
    return (
      <WidgetContainer
        isFullPage
        HeaderComponent={
          <div className="flex flex-row items-center mb-1">
            <div className="bg-sw-success-100 text-sw-gray-975 flex h-[40px] w-[40px] items-center justify-center rounded-full">
              <Icons.Check size={24} />
            </div>
            <Heading className="ml-4">All done</Heading>
          </div>
        }
        FooterComponent={
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              resetSwapState();
            }}>
            Go back
          </Button>
        }>
        <SuccessScreen
          hideHeader
          hash={successfulTransactionDetails.hash}
          transactionLink={successfulTransactionDetails.transactionLink}
          message="Your swap has been successfully completed, and the funds are now available in TON wallet."
        />
      </WidgetContainer>
    );
  }

  const showConfirmSwaps = nextSwap && makeTransferArgs;

  return (
    <WidgetConfigProvider
      config={{
        appName: 'Ton Demo App',
        allowedTargetChainsList: ['ton'],
        hideSendAddress: true,
        walletAddress,
        sendAddress: tonAddress,
        walletSupportedChains,
        intentsAccountType,
        fetchQuote,
        fetchTargetTokens,
        // refetchQuoteInterval: REFETCH_QUOTE_INTERVAL,
        alchemyApiKey: 'CiIIxly0Hi8oQYcQvzgsI',
        tonCenterApiKey:
          '90bffeaa9a8ba0248d8bd642a7321e1d46b3a5ae11510f0e61da5cdc44d83eba',
        chainsFilter: {
          target: { intents: 'none', external: 'all' },
          source: {
            intents: 'none',
            external: appKitWalletAddress ? 'wallet-supported' : 'all',
          },
        },
      }}
      localisation={{
        'submit.active.external.swap': 'Swap now',
      }}>
      {showConfirmSwaps && (
        <WidgetContainer
          isFullPage
          HeaderComponent={
            <div className="flex flex-row items-center mb-1">
              <button
                type="button"
                className="bg-sw-gray-900 text-sw-gray-100 flex h-[40px] w-[40px] items-center justify-center rounded-full cursor-pointer"
                onClick={() => {
                  resetSwapState();
                }}>
                <Icons.ArrowLeft size={20} />
              </button>
              <Heading className="ml-4">Confirm swaps</Heading>
            </div>
          }
          FooterComponent={
            <Button
              variant="primary"
              size="lg"
              state={isSwapInProgress ? 'loading' : 'default'}
              onClick={() => {
                if (nextSwap.swapType === 'oneclick') {
                  void confirmOneClickSwap(makeTransferArgs);

                  return;
                }

                void confirmOmnistonSwap();
              }}>
              {nextSwap.swapButtonText}
            </Button>
          }>
          {swaps.map((swap, index) => (
            <SwapCard
              key={index}
              state={swap.status}
              title={
                swaps.length > 1 ? `Swap ${index + 1}/${swaps.length}` : 'Swap'
              }
              className={clsx(index > 0 && 'mt-2.5', {
                'opacity-50':
                  index > 0 && swaps[index - 1]?.status !== 'completed',
              })}
              source={swap.source}
              target={swap.target}
            />
          ))}
        </WidgetContainer>
      )}
      <WidgetSwap
        isOneWay
        isFullPage
        isLoading={isAppKitConnecting || isTonConnecting}
        className={showConfirmSwaps ? 'hidden' : undefined}
        makeTransfer={makeTransfer}
        onMsg={(msg) => {
          if (msg.type === 'on_tokens_modal_toggled') {
            setIsTokensModalOpen(msg.isOpen);
          }

          if (msg.type === 'on_select_token' && msg.variant === 'source') {
            setSelectedToken(msg.token);
          }
        }}
        HeaderComponent={
          isTokensModalOpen ? undefined : (
            <>
              <Heading className="mb-8">Swap to TON from anywhere</Heading>
              <WalletConnectionCard />
            </>
          )
        }
      />
    </WidgetConfigProvider>
  );
};
