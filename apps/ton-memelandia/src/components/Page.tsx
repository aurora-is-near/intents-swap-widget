/* eslint-disable no-console */
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Cell } from '@ton/core';
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
  SwapCard,
  useMakeEvmTransfer,
  WidgetConfig,
  WidgetConfigProvider,
  WidgetContainer,
  WidgetSwap,
} from '@aurora-is-near/intents-swap-widget';
import { formatBigToHuman } from '@aurora-is-near/intents-swap-widget/utils';
import clsx from 'clsx';
import { useAppKitWallet } from '../hooks/useAppKitWallet';
import { useTonWallet } from '../hooks/useTonWallet';
import { WalletConnectionCard } from './WalletConnectionCard';
import { Heading } from './Heading';

type SwapState = 'not-started' | 'in-progress' | 'completed' | 'failed';

const TON_ASSET_ID = 'nep245:v2_1.omni.hot.tg:1117_';
const TON_ASSET_ADDRESS = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';
const TARGET_ASSET_ADDRESSES = [
  'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO',
  'EQBX6K9aXVl3nXINCyPPL86C4ONVmQ8vK360u6dykFKXpHCa',
];

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

  const omnistonTxHash: string = (await response.json()).transaction.hash;

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

  const [firstSwapState, setFirstSwapState] =
    useState<SwapState>('not-started');

  const [secondSwapState, setSecondSwapState] =
    useState<SwapState>('not-started');

  /**
   * Fetch a two-step quote.
   *
   * The first quote is done via OneClick, from the selected source asset to TON.
   * The second quote is done via Omniston, from TON to the selected target asset.
   */
  const fetchQuote: WidgetConfig['fetchQuote'] = async (data) => {
    const [{ quote: oneClickQuote }, tokens] = await Promise.all([
      OneClickService.getQuote({
        ...data,
        destinationAsset: TON_ASSET_ID,
      }),
      fetchStonFiAssets([data.destinationAsset]),
    ]);

    // Request the second quote, to see how much of the target asset we can get
    // for the TON we received from OneClick. The quote is stored for later use
    // when performing the swap.
    omnistonQuote.current = await new Promise<OmnistonQuote>((resolve) => {
      omniston
        .requestForQuote({
          settlementMethods: [SettlementMethod.SETTLEMENT_METHOD_SWAP],
          askAssetAddress: {
            blockchain: Blockchain.TON,
            address: data.destinationAsset, // The final target asset
          },
          bidAssetAddress: {
            blockchain: Blockchain.TON,
            address: TON_ASSET_ADDRESS,
          },
          amount: {
            // The amount of TON we got from OneClick
            bidUnits: oneClickQuote.amountOut,
          },
          settlementParams: {
            gaslessSettlement: GaslessSettlement.GASLESS_SETTLEMENT_POSSIBLE,
            maxPriceSlippageBps: 500, // 5% slippage
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

    const targetToken = tokens.find((t) => t.assetId === data.destinationAsset);

    if (!targetToken) {
      throw new Error('Missing target token info');
    }

    const { askUnits, params } = omnistonQuote.current;
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

    return quoteResponse;
  };

  const makeTransfer = (args: MakeTransferArgs) => {
    setFirstSwapState('not-started');
    setSecondSwapState('not-started');
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

  const confirmFirstSwap = async (args: MakeTransferArgs) => {
    setFirstSwapState('in-progress');

    try {
      await makeEvmTransfer(args);
      await waitForOneClickSettlement(args.address);
    } catch (error) {
      setFirstSwapState('failed');
      console.error('First swap failed:', error);

      return;
    }

    setFirstSwapState('completed');
  };

  const confirmSecondSwap = async () => {
    if (!omnistonQuote.current) {
      throw new Error('Missing Omniston quote');
    }

    setSecondSwapState('in-progress');

    try {
      const omnistonTxHash = await performOmnistoneSwap(
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
      setSecondSwapState('failed');
      console.error('Second swap failed:', error);

      return;
    }

    setSecondSwapState('completed');

    // return {
    //   hash: omnistonTxHash,
    //   transactionLink: `https://tonviewer.com/transaction/${omnistonTxHash}`,
    // };
  };

  const isSwapInProgress =
    firstSwapState === 'in-progress' || secondSwapState === 'in-progress';

  const swapButtonText = useMemo(() => {
    if (isSwapInProgress) {
      return 'Confirming';
    }

    if (firstSwapState === 'completed') {
      return 'Confirm in TON wallet';
    }

    return 'Confirm in source wallet';
  }, [secondSwapState]);

  return (
    <WidgetConfigProvider
      config={{
        appName: 'Ton Demo App',
        allowedTargetChainsList: ['ton'],
        walletAddress:
          appKitWalletAddress && tonAddress ? appKitWalletAddress : undefined,
        sendAddress: tonAddress,
        walletSupportedChains,
        intentsAccountType,
        fetchQuote,
        fetchTargetTokens,
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
      {makeTransferArgs ? (
        <WidgetContainer
          isFullPage
          HeaderComponent={<Heading className="mb-3">Confirm swaps</Heading>}
          FooterComponent={
            <Button
              variant="primary"
              size="lg"
              state={isSwapInProgress ? 'loading' : 'default'}
              onClick={() => {
                if (firstSwapState === 'completed') {
                  void confirmSecondSwap();
                }

                void confirmFirstSwap(makeTransferArgs);
              }}>
              {swapButtonText}
            </Button>
          }>
          <SwapCard
            state={firstSwapState}
            title="Swap 1/2"
            source={{
              assetId: makeTransferArgs.sourceAssetId,
              amount: makeTransferArgs.amount,
            }}
            target={{
              assetId: TON_ASSET_ID,
              amount: '0',
            }}
          />
          <SwapCard
            state={secondSwapState}
            title="Swap 2/2"
            className={clsx('mt-2.5', {
              'opacity-50': firstSwapState !== 'completed',
            })}
            source={{
              assetId: TON_ASSET_ID,
              amount: '0',
            }}
            target={{
              assetId: makeTransferArgs.targetAssetId,
              amount: '0',
            }}
          />
        </WidgetContainer>
      ) : (
        <WidgetSwap
          isOneWay
          isFullPage
          isLoading={isAppKitConnecting || isTonConnecting}
          makeTransfer={makeTransfer}
          onMsg={(msg) => {
            if (msg.type === 'on_tokens_modal_toggled') {
              setIsTokensModalOpen(msg.isOpen);
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
      )}
    </WidgetConfigProvider>
  );
};
