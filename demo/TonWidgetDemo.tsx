import { TonConnectButton } from '@tonconnect/ui-react';
import {
  Blockchain,
  Omniston,
  Quote as OmnistonQuote,
  SettlementMethod,
} from '@ston-fi/omniston-sdk';
import {
  OneClickService,
  OpenAPI,
  QuoteRequest,
} from '@defuse-protocol/one-click-sdk-typescript';

import { useMemo } from 'react';
import { SimpleToken, WidgetConfig, WidgetSwap } from '../src';
import { WidgetConfigProvider } from '../src/config';
import { BalanceRpcLoader } from '../src/features/BalanceRpcLoader';
import { WalletConnectButton } from './components/WalletConnectButton';
import { useMultiChainWallet } from './hooks/useMultiChainWallet';
import { RPCS } from './rpcs';
import { formatBigToHuman } from '../src/utils';

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
      recipientType: QuoteRequest.recipientType.INTENTS,
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

  return {
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

export const TonWidgetDemo = () => {
  const {
    wallets,
    address: walletAddress,
    isConnecting: isLoading,
    isEvmConnected,
    chainType,
  } = useMultiChainWallet();

  const walletSupportedChains = useMemo(() => {
    const chains: Array<
      | 'ton'
      | 'eth'
      | 'arb'
      | 'pol'
      | 'bsc'
      | 'op'
      | 'avax'
      | 'base'
      | 'sol'
      | 'near'
    > = [];

    if (wallets.ton) {
      chains.push('ton');
    }

    if (wallets.evm) {
      chains.push('eth', 'arb', 'pol', 'bsc', 'op', 'avax', 'base');
    }

    if (wallets.solana) {
      chains.push('sol');
    }

    // Default to 'near' if no wallets connected
    if (chains.length === 0) {
      chains.push('near');
    }

    return chains as readonly (
      | 'ton'
      | 'eth'
      | 'arb'
      | 'pol'
      | 'bsc'
      | 'op'
      | 'avax'
      | 'base'
      | 'sol'
      | 'near'
    )[];
  }, [wallets]);

  const intentsAccountType = useMemo(() => {
    if (chainType === 'evm') {
      return 'evm';
    }

    if (chainType === 'solana') {
      return 'sol';
    }

    if (chainType === 'ton') {
      // TON wallets use NEAR intents infrastructure
      return 'near';
    }

    return 'near';
  }, [chainType]);

  return (
    <div className="demo-widget-container">
      <WidgetConfigProvider
        config={{
          appName: 'Ton Demo App',
          allowedTargetChainsList: ['ton'],
          walletAddress,
          walletSupportedChains,
          intentsAccountType,
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
        {!!walletAddress && (
          <BalanceRpcLoader rpcs={RPCS} walletAddress={walletAddress} />
        )}
        <WidgetSwap
          isOneWay
          isLoading={isLoading}
          providers={{ near: undefined }}
          makeTransfer={(_args) => Promise.resolve(undefined)}
          onMsg={() => {}}
        />
        <div className="wallet-status-container">
          {walletAddress ? (
            <div className="wallet-connected-badge">
              {!!wallets.ton && <div>✓ TON: {wallets.ton.slice(0, 8)}...</div>}
              {!!wallets.evm && <div>✓ EVM: {wallets.evm.slice(0, 8)}...</div>}
              {!!wallets.solana && (
                <div>✓ Solana: {wallets.solana.slice(0, 8)}...</div>
              )}
            </div>
          ) : null}
          <div className="wallet-buttons-container">
            <WalletConnectButton connectText="Connect Chain Wallet" />
            {isEvmConnected && <TonConnectButton />}
          </div>
        </div>
      </WidgetConfigProvider>
    </div>
  );
};
