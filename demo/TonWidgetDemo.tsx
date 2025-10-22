import {
  OneClickService,
  OpenAPI,
} from '@defuse-protocol/one-click-sdk-typescript';
import {
  Blockchain,
  Omniston,
  Quote as OmnistonQuote,
  SettlementMethod,
} from '@ston-fi/omniston-sdk';
import { useDemoWallet } from './hooks/useDemoWallet';
import { WidgetConfig, WidgetSwap } from '../src';
import { WidgetConfigProvider } from '../src/config';
import { DemoConnectButton } from './components/DemoConnectButton';

const TON_ASSET_ID = 'nep245:v2_1.omni.hot.tg:1117_';
const TON_ASSET_ADDRESS = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';

OpenAPI.BASE = 'https://1click.chaindefuser.com';

const omniston = new Omniston({
  apiUrl: 'wss://omni-ws.ston.fi',
});

/**
 * Fetch a quote base one two swaps.
 *
 * The first swap is done via OneClick, from the selected source asset to TON.
 * The second swap is done via Omniston, from TON to the selected target asset.
 */
const fetchQuote: WidgetConfig['fetchQuote'] = async (data) => {
  const { quote: oneClickQuote } = await OneClickService.getQuote({
    ...data,
    destinationAsset: TON_ASSET_ID,
  });

  // TODO: Make this second quote and somehow return the result in a way that
  // its display makes sense.
  await new Promise<OmnistonQuote>((resolve) => {
    omniston
      .requestForQuote({
        settlementMethods: [SettlementMethod.SETTLEMENT_METHOD_SWAP],
        askAssetAddress: {
          blockchain: Blockchain.TON,
          address: data.destinationAsset,
        },
        bidAssetAddress: {
          blockchain: Blockchain.TON,
          address: TON_ASSET_ADDRESS,
        },
        amount: {
          bidUnits: oneClickQuote.amountOut,
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

  return {
    timeEstimate: oneClickQuote.timeEstimate,
    amountIn: oneClickQuote.amountIn,
    amountInFormatted: oneClickQuote.amountInFormatted,
    amountInUsd: oneClickQuote.amountInUsd,
    minAmountIn: oneClickQuote.minAmountIn,

    // TODO: Replace with the amount out from the Omnistone quote
    amountOut: oneClickQuote.amountOut,
    amountOutFormatted: oneClickQuote.amountOutFormatted,
    amountOutUsd: oneClickQuote.amountOutUsd,
    minAmountOut: oneClickQuote.minAmountOut,
  };
};

/**
 * Fetch the available target tokens.
 */
const fetchTargetTokens: WidgetConfig['fetchTargetTokens'] = async () => {
  return [
    {
      name: 'Meme Coin One',
      symbol: 'MEMEONE',
      price: 0,
      blockchain: 'ton',
      assetId: 'meme-one',
      decimals: 9,
    },
    {
      name: 'Meme Coin Two',
      symbol: 'MEMETWO',
      price: 0,
      blockchain: 'ton',
      assetId: 'meme-two',
      decimals: 9,
    },
  ];
};

export const TonWidgetDemo = () => {
  const {
    address: walletAddress,
    isConnecting: isLoading,
    connect: handleConnectWallet,
  } = useDemoWallet();

  return (
    <div className="demo-widget-container">
      <WidgetConfigProvider
        config={{
          appName: 'Ton Demo App',
          allowedTargetChainsList: ['ton'],
          walletAddress,
          walletSupportedChains: ['near'],
          intentsAccountType: 'near',
          fetchQuote,
          fetchTargetTokens,
          chainsFilter: {
            target: { intents: 'none', external: 'all' },
            source: {
              intents: 'none',
              external: walletAddress ? 'wallet-supported' : 'all',
            },
          },
        }}>
        <WidgetSwap
          isOneWay
          isLoading={isLoading}
          providers={{ near: undefined }}
          makeTransfer={() => Promise.resolve(undefined)}
          onMsg={() => {}}
        />
        <DemoConnectButton
          walletAddress={walletAddress}
          onConnect={handleConnectWallet}
        />
      </WidgetConfigProvider>
    </div>
  );
};
