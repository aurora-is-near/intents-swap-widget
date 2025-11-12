# Configuration

The **Intents Swap Widget** is highly configurable, allowing developers to tailor
its appearance, behavior, and supported networks to fit their application.

Configuration is handled via the `<WidgetConfigProvider>` component, which wraps
your widget and provides global settings.

---

## Setup

To configure the widget, pass a `config` object to the `WidgetConfigProvider`.
This object defines core parameters such as the app identifier, default tokens,
theme, and optional partner fee settings.

### Example

```tsx
import {
  type WidgetConfig,
  WidgetConfigProvider,
  WidgetSwap,
} from '@aurora-is-near/intents-swap-widget';

const config: WidgetConfig = {
  appName: 'Intents Demo',
  connectedWallets: {
    default: '0x...',
    ton: 'ABC123',
  },
  appFees: [
    {
      recipient: 'your.account.near',
      fee: 25, // 0.25%
    },
  ],
};

export default function App() {
  return (
    <WidgetConfigProvider config={config}>
      <WidgetSwap />
    </WidgetConfigProvider>
  );
}
```

## Options

### `appName` [string]

Default: `undefined`

The name used to refer to your app when making NEAR Intents transfers.

---

### `appIcon` [string]

Default: `undefined`

URL or path to your app’s icon, shown in the chain selection dropdown, for example.

---

### `intentsAccountType` ['evm' | 'near' | 'sol']

Default: `'evm'`

Determines which wallet provider (EVM, NEAR, or Solana) is used to sign and
execute NEAR Intents transactions.

---

### `walletSupportedChains` [ReadonlyArray<Chains>]

Default: `[]`

A list of blockchain networks supported, or expected to be supported, by the
connected wallet(s).

---

### `connectedWallets` [Partial<Record<Chains | 'default', string | null>>]

Default: `{}`

A map of connected wallet addresses keyed by chain. Used to determine which
accounts can send or receive tokens on each network.

---

### `sendAddress` [string | null]

Default: `undefined`

Optional fixed destination wallet. If not specified, the widget will use the
source wallet address as the receiver, by default.

---

### `defaultMaxSlippage` [number]

Default: `0.5`

Defines the default maximum slippage tolerance (in percent). Used when calculating the minimum output amount during swaps.

---

### `enableAutoTokensSwitching` [boolean]

Default: `false`

Automatically swaps the source and target tokens if the reverse direction provides a better effective quote.

---

### `refetchQuoteInterval` [number]

Default: `undefined`

The interval (in milliseconds) at which new quotes are fetched automatically. Useful for keeping market prices updated in volatile conditions.

---

### `showIntentTokens` [boolean]

Default: `true`

Controls whether Intents-native tokens (such as wrapped or gasless assets) appear in token lists.

---

### `allowedTokensList` [string[]]

Default: `undefined`

Restricts available tokens globally by their asset IDs. Only tokens in this list will appear in selectors.

---

### `allowedSourceTokensList` [string[]]

Default: `undefined`

Restricts which tokens can be selected as the **source** (sell) token.

---

### `allowedTargetTokensList` [string[]]

Default: `undefined`

Restricts which tokens can be selected as the **target** (buy) token.

---

### `filterTokens` [(token: Token) => boolean]

Default: `() => true`

A custom filter function applied to each token in the list. Return `true` to include the token, or `false` to exclude it.

---

### `chainsOrder` [Chains[]]

Default: `[]`

Defines the display order of supported chains in dropdowns and routing logic.

---

### `allowedChainsList` [Chains[]]

Default: `undefined`

Restricts available networks globally within the widget.

---

### `allowedSourceChainsList` [Chains[]]

Default: `undefined`

Restricts which chains can be used as **source** networks when initiating swaps.

---

### `allowedTargetChainsList` [Chains[]]

Default: `undefined`

Restricts which chains can be used as **target** networks for swaps or bridging.

---

### `chainsFilter` [{ source: ChainsFilter; target: ChainsFilter }]

Default:

```ts
{
  source: () => true,
  target: () => true
}
