import { TonConnectButton } from '@tonconnect/ui-react';

import { WidgetSwap } from '../src';
import { WidgetConfigProvider } from '../src/config';
import { BalanceRpcLoader } from '../src/features/BalanceRpcLoader';
import { WalletConnectButton } from './components/WalletConnectButton';
import { TonPageProviders } from './TonPageProviders';
import { useMultiChainWallet } from './hooks/useMultiChainWallet';
import { RPCS } from './rpcs';

function TonWidgetContent() {
  const {
    wallets,
    address: primaryAddress,
    isConnecting: isLoading,
    chainType,
  } = useMultiChainWallet();

  // Combine supported chains from ALL connected wallets
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

  // Use primary wallet address for intents account type
  const intentsAccountType = (() => {
    if (chainType === 'evm') {
      return 'evm';
    }

    if (chainType === 'solana') {
      return 'sol';
    }

    return 'near'; // Default for 'ton', 'unknown', or no wallet
  })();

  // Use primary address as the main wallet address
  const walletAddress = primaryAddress;

  return (
    <div className="demo-widget-container">
      <WidgetConfigProvider
        config={{
          appName: 'Ton Demo App',
          allowedTargetChainsList: ['ton'],
          allowedTargetTokensList: ['nep245:v2_1.omni.hot.tg:1117_'],
          walletAddress,
          walletSupportedChains,
          intentsAccountType,
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
        <div
          style={{
            marginTop: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'center',
          }}>
          {walletAddress ? (
            <div
              style={{
                padding: '8px 16px',
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: 8,
                fontSize: 14,
                color: '#6366f1',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}>
              {!!wallets.ton && <div>✓ TON: {wallets.ton.slice(0, 8)}...</div>}
              {!!wallets.evm && <div>✓ EVM: {wallets.evm.slice(0, 8)}...</div>}
              {!!wallets.solana && (
                <div>✓ Solana: {wallets.solana.slice(0, 8)}...</div>
              )}
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
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
