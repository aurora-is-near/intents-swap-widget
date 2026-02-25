import {
  WidgetConfigProvider,
  WidgetConfigProviderProps,
} from '@aurora-is-near/intents-swap-widget';
import {
  AppKitProvider,
  useAppKitWallet,
  useAppKitProviders,
} from '@aurora-is-near/intents-swap-widget-standalone';

export type DappWalletBridgeProps = Omit<
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

function DappWalletBridgeInner({
  config,
  children,
  ...restProps
}: DappWalletBridgeProps) {
  const { address, isConnected, connect, disconnect } = useAppKitWallet();
  const { evm: evmProvider, sol: solanaProvider } = useAppKitProviders();

  return (
    <>
      <div className="flex justify-end mb-csw-xl sm:absolute sm:top-csw-xl sm:right-csw-xl sm:mb-0">
        <button
          type="button"
          onClick={() => (isConnected ? disconnect() : connect())}
          className="flex flex-row items-center rounded-csw-md px-csw-lg py-csw-2md transition-colors duration-100 font-semibold text-xs tracking-[-0.4px] whitespace-nowrap gap-x-csw-md cursor-pointer bg-csw-accent-500 hover:bg-csw-accent-400 text-csw-gray-950 select-none">
          {isConnected ? 'Disconnect Wallet' : 'Connect Wallet'}
        </button>
      </div>

      <WidgetConfigProvider
        config={{
          ...config,
          connectedWallets: { default: address },
          providers: { evm: evmProvider, sol: solanaProvider },
        }}
        {...restProps}>
        {children}
      </WidgetConfigProvider>
    </>
  );
}

export const DappWalletBridge = ({
  config,
  children,
  ...restProps
}: DappWalletBridgeProps) => {
  return (
    <AppKitProvider appName={config.appName} theme={restProps.theme}>
      <DappWalletBridgeInner config={config} {...restProps}>
        {children}
      </DappWalletBridgeInner>
    </AppKitProvider>
  );
};
