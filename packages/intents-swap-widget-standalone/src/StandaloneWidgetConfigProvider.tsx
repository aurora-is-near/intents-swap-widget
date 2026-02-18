import {
  WidgetConfigProvider,
  WidgetConfigProviderProps,
} from '@aurora-is-near/intents-swap-widget';
import { AppKitProvider } from './appkit';
import { useWalletSelector } from './useWalletSelector';
import { WalletSelectorModal } from './WalletSelectorModal';

export type StandaloneWidgetConfigProviderProps = Omit<
  WidgetConfigProviderProps,
  'config'
> & {
  config: Omit<
    WidgetConfigProviderProps['config'],
    | 'connectedWallets'
    | 'providers'
    | 'onWalletSignin'
    | 'onWalletSignout'
    | 'showProfileButton'
  >;
};

function StandaloneWalletBridge({
  config,
  children,
  ...restProps
}: StandaloneWidgetConfigProviderProps) {
  const wallet = useWalletSelector();

  return (
    <>
      <WidgetConfigProvider
        config={{
          ...config,
          connectedWallets: wallet.connectedWallets,
          providers: wallet.providers,
          onWalletSignin: wallet.connect,
          onWalletSignout: wallet.disconnect,
          showProfileButton: true,
        }}
        {...restProps}>
        {children}
      </WidgetConfigProvider>

      <WalletSelectorModal
        open={wallet.showSelector}
        onClose={wallet.closeSelector}
        onSelectNear={wallet.selectNear}
        onSelectEvmSolana={wallet.selectEvmSolana}
      />
    </>
  );
}

export const StandaloneWidgetConfigProvider = ({
  config,
  children,
  ...restProps
}: StandaloneWidgetConfigProviderProps) => {
  return (
    <AppKitProvider appName={config.appName} theme={restProps.theme}>
      <StandaloneWalletBridge config={config} {...restProps}>
        {children}
      </StandaloneWalletBridge>
    </AppKitProvider>
  );
};
