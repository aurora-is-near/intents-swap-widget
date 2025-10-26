import {
  TonConnectButton,
  TonConnectUIProvider,
  useTonConnectUI,
} from '@tonconnect/ui-react';
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
import { useMemo, useRef } from 'react';
import { Chains, SimpleToken, WidgetConfig, WidgetSwap } from '../src';
import { WidgetConfigProvider } from '../src/config';
import { WalletConnectButton } from './components/WalletConnectButton';
import { useAppKitWallet } from './hooks/useAppKitWallet';
import { formatBigToHuman } from '../src/utils';
import { useTonWallet } from './hooks/useTonWallet';

const TON_ASSET_ID = 'nep245:v2_1.omni.hot.tg:1117_';
const TON_ASSET_ADDRESS = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';
const TARGET_ASSET_ADDRESSES = [
  'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO',
  'EQBX6K9aXVl3nXINCyPPL86C4ONVmQ8vK360u6dykFKXpHCa',
];

OpenAPI.BASE = 'https://1click.chaindefuser.com';

type SwapState = {
  oneClickDepositAddress?: string;
  omnistonQuote?: OmnistonQuote;
  omnistonTxHash?: string;
};

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

const getTonConnectManifestUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/tonconnect-manifest.json`;
  }

  return '/tonconnect-manifest.json';
};

const TonWidgetDemoContent = () => {
  const {
    address: appKitWalletAddress,
    chainType,
    isConnecting: isAppKitConnecting,
    isConnected: isAppKitConnected,
  } = useAppKitWallet();

  const { address: tonAddress, isConnecting: isTonConnecting } = useTonWallet();
  const [tonConnect] = useTonConnectUI();
  const swapState = useRef<SwapState>(null);

  const updateSwapState = (newState: Partial<SwapState>) => {
    swapState.current = {
      ...swapState.current,
      ...newState,
    };

    // eslint-disable-next-line no-console
    console.debug('swapState', swapState.current);
  };

  /**
   * Fetch a two-step quote.
   *
   * The first quote is done via OneClick, from the selected source asset to TON.
   * The second quote is done via Omniston, from TON to the selected target asset.
   */
  const fetchQuote: WidgetConfig['fetchQuote'] = async (data) => {
    // Reset the swap state when a new quote is requested.
    swapState.current = {};

    const [{ quote: oneClickQuote }, tokens] = await Promise.all([
      OneClickService.getQuote({
        ...data,
        destinationAsset: TON_ASSET_ID,
      }),
      fetchStonFiAssets([data.destinationAsset]),
    ]);

    // Request the second quote, to see how much of the target asset we can get
    // for the TON we received from OneClick.
    const omnistonQuote = await new Promise<OmnistonQuote>((resolve) => {
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

    const { askUnits, params } = omnistonQuote;
    const minAskAmount = params?.swap?.minAskAmount ?? askUnits;
    const amountOutHuman = parseFloat(
      formatBigToHuman(askUnits, targetToken.decimals),
    );

    const amountOutUsd = amountOutHuman * targetToken.price;

    // The deposit address will be needed later when monitoring the transfer.
    updateSwapState({ oneClickDepositAddress: oneClickQuote.depositAddress });

    // Store the Omniston quote for later use when performing the swap.
    updateSwapState({ omnistonQuote });

    return {
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
  };

  const performOmnistoneSwap = async () => {
    const { omnistonQuote } = swapState.current ?? {};

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

    const externalTxHash = Cell.fromBase64(sendTxRes.boc)
      .hash()
      .toString('hex');

    const response = await fetch(
      `https://tonapi.io/v2/traces/${externalTxHash}`,
    );

    const omnistonTxHash = (await response.json()).transaction.hash;

    updateSwapState({ omnistonTxHash });
  };

  /**
   * Wait for the OneClick transfer to be settled.
   */
  const waitForOneClickSettlement = async () => {
    const { oneClickDepositAddress } = swapState.current ?? {};

    if (!oneClickDepositAddress) {
      throw new Error('Missing OneClick deposit address');
    }

    const res = await OneClickService.getExecutionStatus(
      oneClickDepositAddress,
    );

    // Poll again after a delay if still processing
    if (res.status === GetExecutionStatusResponse.status.PROCESSING) {
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      return waitForOneClickSettlement();
    }

    // TODO: better handle error states
    if (res.status === GetExecutionStatusResponse.status.FAILED) {
      throw new Error('OneClick transfer failed');
    }
  };

  const waitForOmnistonSettlement = () => {
    const { omnistonQuote, omnistonTxHash } = swapState.current ?? {};

    if (!omnistonQuote) {
      throw new Error('Missing Omniston quote');
    }

    if (!omnistonTxHash) {
      throw new Error('Missing Omniston transaction hash');
    }

    const tradeStatus = omniston.trackTrade({
      quoteId: omnistonQuote.quoteId,
      traderWalletAddress: {
        blockchain: Blockchain.TON,
        address: tonAddress,
      },
      outgoingTxHash: omnistonTxHash,
    });

    return new Promise((resolve) => {
      tradeStatus.subscribe(({ status }) => {
        if (status?.tradeSettled) {
          resolve(null);
        }
      });
    });
  };

  const processTransfer = async () => {
    await waitForOneClickSettlement();

    await performOmnistoneSwap();

    await waitForOmnistonSettlement();
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

  return (
    <div className="demo-widget-container">
      <WidgetConfigProvider
        config={{
          appName: 'Ton Demo App',
          allowedTargetChainsList: ['ton'],
          walletAddress: appKitWalletAddress,
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
        }}>
        <WidgetSwap
          isOneWay
          isLoading={isAppKitConnecting || isTonConnecting}
          providers={{ near: undefined }}
          onMsg={(msg) => {
            if (msg.type === 'on_transfer_success') {
              void processTransfer();
            }
          }}
        />
        <div className="demo-widget-footer">
          <WalletConnectButton connectText="Connect Chain Wallet" />
          {isAppKitConnected && <TonConnectButton />}
        </div>
      </WidgetConfigProvider>
    </div>
  );
};

export const TonWidgetDemo = () => (
  <TonConnectUIProvider manifestUrl={getTonConnectManifestUrl()}>
    <TonWidgetDemoContent />
  </TonConnectUIProvider>
);
