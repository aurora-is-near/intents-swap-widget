# Getting Started

The **Intents Swap Widget** lets you integrate a fully functional, cross-chain swap interface into your application in just a few lines of code.

## 1. Installation

Install the widget package using your preferred package manager:

```bash
npm install @aurora-is-near/intents-swap-widget

# or

yarn add @aurora-is-near/intents-swap-widget
```

Alternatively, if you want to use the widget in standalone mode with embedded wallet connection mechanisms:

```bash
npm install @aurora-is-near/intents-swap-widget-standalone

# or

yarn add @aurora-is-near/intents-swap-widget-standalone
```

## 2. Setup

Wrap your app, or just the area where the widget appears, with the `WidgetConfigProvider`, then render one of our prebuilt widgets within it.

For example, the snippet below shows how to render the combined widget.

```tsx
import {
  WidgetConfigProvider,
  Widget,
} from '@aurora-is-near/intents-swap-widget';

export default function App() {
  return (
    <WidgetConfigProvider config={{ appName: 'MyApp' }}>
      <Widget />
    </WidgetConfigProvider>
  );
}
```

There are also individual `WidgetSwap`, `WidgetTransfer` and `WidgetWithdraw` widgets.

For a full list of configuration options see the [Configuration](./) page.

### 3. Styling

To apply the package styles you need to import the package styles into your apps stylesheet, for example:

```css
@import '@aurora-is-near/intents-swap-widget/styles.css';

.my-class {
  background-color: #fff;
}
```

For more details about the available theming options see the [Theming](theming.md) page.

### 4. Connect a wallet

If you are using standalone mode the wallet connection mechanism is built in.

If you want to use your existing wallet integration (e.g. AppKit, Provy, TonConnect, etc.) you can pass the connected address via the `connectedWallets` config option.

Here is an example that assumes you are using [AppKit](https://docs.reown.com/appkit/overview) and have a hook for providing the wallet address and a button for connecting.

```tsx
import {
  WidgetConfigProvider,
  Widget,
} from '@aurora-is-near/intents-swap-widget';
import { useAppKitWallet } from './hooks/useAppKitWallet';
import { WalletConnectButton } from './components/WalletConnectButton';

export const SimpleWidgetDemo = () => {
  const { address: walletAddress, isConnecting: isLoading } = useAppKitWallet();

  return (
    <WidgetConfigProvider
      config={{ connectedWallets: { default: walletAddress } }}
    >
      <Widget
        isFullPage
        isLoading={isLoading}
        FooterComponent={<WalletConnectButton />}
      />
    </WidgetConfigProvider>
  );
};
```
