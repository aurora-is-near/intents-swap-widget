# Configuration

The Intents Swap Widget is highly configurable, allowing developers to tailor
its appearance and behavior to fit their application.

Configuration is handled via the `<WidgetConfigProvider>` component, which wraps
your widget(s) and provides global settings.

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
      fee: 25,
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

### `appName`

The name used to refer to your app when making NEAR Intents transfers.

### `appIcon`

URL to your app's icon. Shown in the chain selection dropdown.

### `intentsAccountType`

Determines which wallet provider (EVM, NEAR, or Solana) is used to sign and
execute NEAR Intents transactions.

### `walletSupportedChains`

A list of blockchain networks supported, or expected to be supported, by the
connected wallet(s).

### `connectedWallets`

A map of connected wallet addresses keyed by chain. Used to determine which
accounts can send or receive tokens on each network.

### `sendAddress`

Optional fixed destination wallet. If not specified the widget will use the
source wallet address as the receiver, by default.

### `slippageTolerance`

The slippage tolerance for a swap. This value is defined in basis points
(1/100th of a percent), for example, 100 for 1% slippage.

### `enableAutoTokensSwitching`

When enabled, the widget automatically rotates the source and target tokens if
the user selects the same token on both sides.

### `refetchQuoteInterval`

The interval in milliseconds at which new quotes are fetched automatically.
Useful for keeping market prices updated in volatile conditions.

### `showIntentTokens`

Controls whether NEAR Intents tokens appear in token lists.

### `allowedTokensList`

Used to specify the available tokens by their NEAR intents asset IDs. It will
only be possible to select tokens from this list in both the source and the
target inputs.

### `allowedSourceTokensList`

Used to specify the available **source** tokens by their NEAR intents asset IDs.
It will only be possible to select tokens from this list in the source input.

### `allowedTargetTokensList`

Used to specify the available **target** tokens by their NEAR intents asset IDs.
It will only be possible to select tokens from this list in the target input.

### `filterTokens`

A custom filter function applied to tokens in both the source and target lists.
Return `true` to include the token, or `false` to exclude it.

### `chainsOrder`

Defines the display order of supported chains in dropdowns and routing logic.

### `allowedChainsList`

Restricts which chains that can be used when selecting source or target tokens.

### `allowedSourceChainsList`

Restricts which chains can be used when selecting **source** tokens.

### `allowedTargetChainsList`

Restricts which chains can be used when selecting **target** tokens.

### `chainsFilter`

Specify high-level categories of chains that should be displayed when selecting
the source or target token.

#### Example

```ts
const config = {
  chainsFilter: {
    source: { external: 'wallet-supported', intents: 'none' },
    target: { external: 'all', intents: 'none' },
  },
};
```

### `fetchQuote`

A function used to implement custom quote fetching behaviour, overriding the
default of calling the [1Click API](https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api)
quote endpoint.

For example, you might want to use this proxy quotes via your own API endpoint
and insert some additional data based on your backend logic.

#### Example

```ts
const config = {
  fetchQuote: async (data, { signal }) => {
    const res = await axios.post(
    'https://my.proxy.com/quote',
      data,
      { signal },
    );

    return res.data;
  },
}
```

### `fetchSourceTokens`

A function used to fetch a list of custom **source** tokens.

For example, you might want to make a call to some API endpoint.

#### Example

```ts
const config = {
  fetchSourceTokens: async () => {
    const res = await fetch('https://example.com/tokens');

    return res.json();
  },
}
```

### `fetchTargetTokens`

A function used to fetch a list of custom **target** tokens.

For example, you might want to make a call to some API endpoint.

#### Example

```ts
const config = {
  fetchTargetTokens: async () => {
    const res = await fetch('https://example.com/tokens');

    return res.json();
  },
}
```

### `appFees`

A list of recipients and their associated fees that will be applied to each swap
or transfer.

#### Properties

- **`recipient` [string]**
  Account ID within Intents to which this fee will be transferred.

- **`fee` [number]**
  Fee for this recipient as part of amountIn in basis points (1/100th of a percent),
  for example, 100 for a 1% fee.

#### Example

```ts
const config = {
  appFees: [
    {
      recipient: 'recipient.near',
      fee: 100,
    }
  ]
}
```

### `alchemyApiKey`

An API key for integrating with [Alchemy](alchemy.com).

This is useful for enabling more reliable balance fetching for EVM chains.

### `tonCenterApiKey`

An API key for integrating with [TON Center](https://toncenter.com/).

This is useful for fetching balances for the TON chain.

### `hideSendAddress`

Used to hide the send address when swapping or withdrawing.

### `hideTokenInputHeadings`

Used to hide the headings on the token input boxes.
