# Configuration

The **Intents Swap Widget** is highly configurable, allowing developers to tailor
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
  Widget,
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
      <Widget />
    </WidgetConfigProvider>
  );
}
```

## Options

### `appName`

The name used to refer to your app when making NEAR Intents transfers.

### `appIcon`

URL to your app's icon. Shown in the chain selection dropdown.

### `enableAccountAbstraction`

Used to allow uses to deposit to and withdraw from your app's internal Intents
account.

### `enableStandaloneMode`

Render the widget with its own AppKit-based wallet connection mechanism, as an
alternative to controlling the connection externally and passing in walled
addresses via `connectedWallets`.

### `intentsAccountType`

Determines which wallet provider (EVM, NEAR, or Solana) is used to sign and
execute NEAR Intents transactions.

### `walletSupportedChains`

A list of blockchain networks supported by the connected wallet(s).

### `connectedWallets`

A map of connected wallet addresses keyed by chain. Used to determine which
accounts can send or receive tokens on each network.

### `sendAddress`

Optional fixed destination wallet. If not specified the widget will use the
source wallet address as the receiver, by default.

### `slippageTolerance`

The slippage tolerance for a transfer.

This value is defined in basis points (1/100th of a percent). For example, 100
for 1% slippage, or 50 for 0.5% slippage.

### `enableAutoTokensSwitching`

When enabled, the widget automatically rotates the source and target tokens if
the user selects the same token on both sides.

### `refetchQuoteInterval`

The interval in milliseconds at which new quotes are fetched automatically.
Useful for keeping market prices updated in volatile conditions.

### `showIntentTokens`

Controls whether NEAR Intents tokens appear in token lists.

### `allowedTokensList`

Specifies the available tokens by their NEAR intents asset IDs or token symbols.
It will only be possible to select tokens from this list in both the source and
the target inputs.

### `allowedSourceTokensList`

Specifies the available **source** tokens by their NEAR intents asset IDs or
token symbols. It will only be possible to select tokens from this list in the
source input.

### `allowedTargetTokensList`

Specifies the available **target** tokens by their NEAR intents asset IDs or
token symbols. It will only be possible to select tokens from this list in the
target input.

### `filterTokens`

A filter function applied to tokens in both the source and target lists. Return
`true` to include the token, or `false` to exclude it.

This can be useful when we want to exclude, rather than include particular tokens.
If you want to include particular tokens the `allowedTokensList` option might
be more suitable.

### `defaultSourceToken`

Predefine the default source token. Can be set to `null` to keep it not selected.

### `defaultTargetToken`

Predefine the default target token. Can be set to `null` to keep it not selected.

### `chainsOrder`

Defines the order in which supported chains are displayed.

Can be used to bring particular chains to the top of the list. Any chains not
specified here will be sorted according to a default order.

#### Example

```ts
const config = {
  chainsOrder: ['eth', 'btc', 'near'],
}
```

### `topChainShortcuts`

Defines top chain shortcuts that are visible to a user for quick access in
tokens modal.

You can specify different lists of chains based on user's account type (wallet
connected). Four chains must be specified to keep layout clean. If the following
configuration attributes are set: `allowedChainsList`, `allowedSourceChainsList`
or `allowedTargetChainsList` and a chain is not in those lists it's shortcut
won't be displayed, be careful specifying multiple chain filters.

#### Example

```ts
const config = {
  // this is the default behaviour
  topChainShortcuts: (intentsAccountType) => {
    switch (intentsAccountType) {
      case 'evm':
        return ['eth', 'arb', 'avax', 'base'] as const;
      case 'sol':
        return ['sol', 'eth', 'btc', 'near'] as const;
      case 'near':
        return ['near', 'sol', 'eth', 'btc'] as const;
      default:
        return ['eth', 'btc', 'sol', 'near'] as const;
    }
  },
}
```

### `allowedChainsList`

Restricts which chains that can be used when selecting source or target tokens.

#### Example

```ts
const config = {
  allowedChainsList: ['base', 'eth', 'ton'],
}
```

### `allowedSourceChainsList`

Restricts which chains can be used when selecting **source** tokens.

#### Example

```ts
const config = {
  allowedSourceChainsList: ['base', 'eth'],
}
```

### `allowedTargetChainsList`

Restricts which chains can be used when selecting **target** tokens.

#### Example

```ts
const config = {
  allowedTargetChainsList: ['ton'],
}
```

### `chainsFilter`

Specify high-level categories of chains that should be displayed when selecting
the source or target token.

You will probably find the internal defaults sufficient in most cases, which
are driven by the `enableAccountAbstraction` option and whether or not there
are any `connectedWallets`. However, this option exists for the case where you
want more fine-grained control, for example, when building your own custom
widget using our components.

#### Example

```ts
const config = {
  chainsFilter: {
    source: { external: 'wallet-supported', intents: 'none' },
    target: { external: 'all', intents: 'none' },
  },
};
```

### `priorityAssets`

Defines the order in which tokens with no balance are displayed on top of the list.

If you want to promote certain tokens or just show most used on top of the list
you can add them here and they will be displayed in a given order. Tokens that
have balance always stay on top regardless. Tokens with no balance and not included
in `priorityAssets` are sorted alphabetically at the bottom of the list.

The option accepts an array of arrays, where each child array defines either
the chain ID and token symbol, or the asset ID.

#### Example

```ts
const config = {
  priorityAssets: [
    ['eth', 'ETH'],
    ['eth', 'USDT'],
  ],
};
```

or use asset IDs:

```ts
const config = {
  priorityAssets: [
    'nep141:eth.omft.near',
    'nep141:eth-0xdac17f958d2ee523a2206206994597c13d831ec7.omft.near',
  ],
};
```

or mix:

```ts
const config = {
  priorityAssets: [
    'nep141:eth.omft.near',
    ['eth', 'USDT'],
  ],
};
```

### `fetchQuote`

A function used to implement custom quote fetching behaviour, overriding the
default of calling the
[1Click API quote endpoint](https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api#post-v0-quote).

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

### `onWalletSignin`

Used to trigger wallet connection for main action button. If this function is
not provided and you are not using standlone mode (see `enableStandaloneMode`)
the button will have the label "Connect wallet" and not be clickable.

### `onWalletSignout`

Used to sign out user's wallet. Currently used for compatibility check modal if
a wallet is incompatible. NB: some wallets don't support programmatic logout
make sure you guide user accordingly if required on your side.

### `themeParentElementSelector`

HTML element that defines CSS theming variables. If not set, the `body` element
is used.

### `lockSwapDirection`

By default, when using the swap widget, we can click the arrow in the middle
to switch the swap direction. This option disables that feature.

### `providers`

The provider(s) for interacting with the `connectedWallets`. Used for signing
messages.
