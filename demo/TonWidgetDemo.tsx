import { TonConnectButton } from '@tonconnect/ui-react';
import {
  Blockchain,
  Omniston,
  OmnistonQuote,
  SettlementMethod,
} from '@ston-fi/omniston-sdk';
import {
  OneClickService,
  OpenAPI,
} from '@defuse-protocol/one-click-sdk-typescript';

import { WidgetSwap } from '../src';
import type { WidgetConfig } from '../src/config';
import { WidgetConfigProvider } from '../src/config';
import { BalanceRpcLoader } from '../src/features/BalanceRpcLoader';
import { WalletConnectButton } from './components/WalletConnectButton';
import { TonPageProviders } from './TonPageProviders';
import { useMultiChainWallet } from './hooks/useMultiChainWallet';
import { RPCS } from './rpcs';

const TON_ASSET_ID = 'nep245:v2_1.omni.hot.tg:1117_';
const TON_ASSET_ADDRESS = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
const TARGET_ASSET_ADDRESSES = [
  'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO',
  'EQBX6K9aXVl3nXINCyPPL86C4ONVmQ8vK360u6dykFKXpHCa',
];

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
  const res = await fetch('https://api.ston.fi/v1/assets/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      unconditional_assets: TARGET_ASSET_ADDRESSES,
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
    .filter((asset) => TARGET_ASSET_ADDRESSES.includes(asset.contract_address))
    .map((asset) => ({
      symbol: asset.meta.symbol,
      price: parseFloat(asset.dex_price_usd),
      blockchain: 'ton',
      assetId: asset.contract_address,
      decimals: asset.meta.decimals,
    }));
};

function TonWidgetContent() {
  const {
    wallets,
    address: primaryAddress,
    isConnecting: isLoading,
    chainType,
  } = useMultiChainWallet();

  const walletSupportedChains = (() => {
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
  })();

  const intentsAccountType = (() => {
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
  })();

  const walletAddress = primaryAddress;

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
            <TonConnectButton />
            <WalletConnectButton />
          </div>
        </div>
      </WidgetConfigProvider>
    </div>
  );
}

export function TonWidgetDemo() {
  return (
    <TonPageProviders>
      <TonWidgetContent />
    </TonPageProviders>
  );
}
