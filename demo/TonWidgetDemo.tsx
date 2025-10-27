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
import {
  Chains,
  MakeTransferArgs,
  SimpleToken,
  WidgetConfig,
  WidgetSwap,
} from '../src';
import { WidgetConfigProvider } from '../src/config';
import { WalletConnectButton } from './components/WalletConnectButton';
import { useAppKitWallet } from './hooks/useAppKitWallet';
import { formatBigToHuman } from '../src/utils';
import { useTonWallet } from './hooks/useTonWallet';
import { useMakeEvmTransfer } from '../src/hooks/useMakeEvmTransfer';
import { logger } from '../src/logger';

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
  const omnistonQuote = useRef<OmnistonQuote>(null);
  const { make: makeEvmTransfer } = useMakeEvmTransfer();

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

    logger.debug(`[DEBUG] OneClick Quote:`, oneClickQuote);

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

    logger.debug(`[DEBUG] Omniston Quote:`, omnistonQuote.current);

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

    logger.debug(`[DEBUG] Quote response for widget:`, quoteResponse);

    return quoteResponse;
  };

  const makeTransfer = async (args: MakeTransferArgs) => {
    if (!omnistonQuote.current) {
      throw new Error('Missing Omniston quote');
    }

    logger.debug(`[DEBUG] Performing transfer with args:`, args);

    // TODO: Support solana transfers
    await makeEvmTransfer(args);

    logger.debug(
      `[DEBUG] Waiting for OneClick settlement for deposit address: ${args.address}`,
    );

    await waitForOneClickSettlement(args.address);

    logger.debug(`[DEBUG] Performing Omnistone swap to address: ${tonAddress}`);

    const omnistonTxHash = await performOmnistoneSwap(
      omnistonQuote.current,
      tonAddress,
      tonConnect,
    );

    logger.debug(
      `[DEBUG] Waiting for Omniston settlement for quote ID: ${omnistonQuote.current.quoteId}`,
    );

    await waitForOmnistonSettlement(
      omnistonQuote.current.quoteId,
      omnistonTxHash,
      tonAddress,
    );

    return {
      hash: omnistonTxHash,
      transactionLink: `https://tonviewer.com/transaction/${omnistonTxHash}`,
    };
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
          makeTransfer={makeTransfer}
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
