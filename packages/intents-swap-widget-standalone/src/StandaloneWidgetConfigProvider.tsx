import {
  WidgetConfigProvider,
  WidgetConfigProviderProps,
} from '@aurora-is-near/intents-swap-widget';
import { AppKitProvider } from './appkit';
import { useAppKitWallet } from './useAppKitWallet';
import { useAppKitProviders } from './useAppKitProviders';

export type StandaloneWidgetConfigProviderProps = Omit<WidgetConfigProviderProps, 'config'> & {
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
  const wallet = useAppKitWallet();
  const providers = useAppKitProviders();

  return (
    <WidgetConfigProvider
      config={{
        ...config,
        connectedWallets: { default: wallet.address },
        providers,
        onWalletSignin: wallet.connect,
        onWalletSignout: wallet.disconnect,
        showProfileButton: true,
      }}
      {...restProps}>
      {children}
    </WidgetConfigProvider>
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
