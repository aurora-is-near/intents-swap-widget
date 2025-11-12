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

### `appName` [string]

Default: `'Unknown'`

The name used to refer to your app when making NEAR Intents transfers.

### `appIcon` [string]

Default: `'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/unknown.svg'`

URL or path to your app’s icon, shown in the chain selection dropdown, for example.

### `intentsAccountType` ['evm' | 'near' | 'sol']

Default: `'evm'`

Determines which wallet provider (EVM, NEAR, or Solana) is used to sign and
execute NEAR Intents transactions.

### `walletSupportedChains` [ReadonlyArray<Chains>]

Default: `EVM_CHAINS`

A list of blockchain networks supported, or expected to be supported, by the
connected wallet(s).

### `connectedWallets` [Partial<Record<Chains | 'default', string | null>>]

Default: `{}`

A map of connected wallet addresses keyed by chain. Used to determine which
accounts can send or receive tokens on each network.

### `sendAddress` [string | null]

Default: `undefined`

Optional fixed destination wallet. If not specified the widget will use the
source wallet address as the receiver, by default.

### `slippageTolerance` [number]

Default: `100`

The slippage tolerance for a swap. This value is defined in basis points
(1/100th of a percent), for example, 100 for 1% slippage.

### `enableAutoTokensSwitching` [boolean]

Default: `true`

When enabled, the widget automatically rotates the source and target tokens if
the user selects the same token on both sides.

### `refetchQuoteInterval` [number]

Default: `undefined`

The interval in milliseconds at which new quotes are fetched automatically.
Useful for keeping market prices updated in volatile conditions.

### `showIntentTokens` [boolean]

Default: `true`

Controls whether NEAR Intents tokens appear in token lists.

### `allowedTokensList` [string[]]

Default: `undefined`

Used to specify the available tokens by their NEAR intents asset IDs. It will
only be possible to select tokens from this list in both the source and the
target inputs.

### `allowedSourceTokensList` [string[]]

Default: `undefined`

Used to specify the available **source** tokens by their NEAR intents asset IDs.
It will only be possible to select tokens from this list in the source input.

### `allowedTargetTokensList` [string[]]

Default: `undefined`

Used to specify the available **target** tokens by their NEAR intents asset IDs.
It will only be possible to select tokens from this list in the target input.

### `filterTokens` [(token: Token) => boolean]

Default: `() => true`

A custom filter function applied to tokens in both the source and target lists.
Return `true` to include the token, or `false` to exclude it.

### `chainsOrder` [Chains[]]

Default: `[]`

Defines the display order of supported chains in dropdowns and routing logic.

### `allowedChainsList` [Chains[]]

Default: `undefined`

Restricts which chains that can be used when selecting source or target tokens.

### `allowedSourceChainsList` [Chains[]]

Default: `undefined`

Restricts which chains can be used when selecting **source** tokens.

### `allowedTargetChainsList` [Chains[]]

Default: `undefined`

Restricts which chains can be used when selecting **target** tokens.

### `chainsFilter` [{ source: ChainsFilter; target: ChainsFilter }]

Default:

```ts
{
  source: () => true,
  target: () => true
}
```

### `fetchQuote`

Used to provide a custom quote function to override the default of calling the
[1Click API](https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api).

For example, you might want to proxy quotes via your own endpoint, as in the
following example.

```ts
const fetchQuote = async (data, { signal }) => {
  const res = await axios.post(
   'https://my.proxy.com/quote',
    data,
    { signal },
  );

  return res.data;
};
```
