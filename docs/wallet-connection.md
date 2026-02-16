# Wallet Connection

The **Intents Swap Widget** needs access to a wallet to sign transactions and fetch balances. You choose how that wallet connection happens: either the widget manages it for you, or you handle it yourself and pass the details in.

## Two Approaches

|                      | Built-in                                                                   | External                                                            |
| -------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **How it works**     | Widget opens its own wallet modal (via AppKit)                             | You connect the wallet and pass addresses + providers to the widget |
| **Enable with**      | `enableStandaloneMode: true`                                               | Pass `connectedWallets` and `providers` (default behavior)          |
| **Supported chains** | EVM (Ethereum, Arbitrum, Polygon, BSC, Optimism, Avalanche, Base) + Solana | Any chain the widget supports, including NEAR and TON               |
| **Setup effort**     | Minimal                                                                    | More code, but more control                                         |

## Built-in Wallet Connection

Set `enableStandaloneMode: true` and the widget renders its own connect-wallet button. Under the hood it uses [AppKit by Reown](https://docs.reown.com/appkit/overview) to present a wallet modal supporting 50+ wallets via WalletConnect, plus Phantom and Solflare for Solana.

### Supported chains

Ethereum, Arbitrum, Polygon, BSC, Optimism, Avalanche, Base, and Solana.

### Code example

```tsx
import {
  WidgetConfigProvider,
  Widget,
} from '@aurora-is-near/intents-swap-widget';

export default function App() {
  return (
    <WidgetConfigProvider
      config={{
        appName: 'MyApp',
        enableStandaloneMode: true,
      }}
    >
      <Widget />
    </WidgetConfigProvider>
  );
}
```

That's it. No wallet hooks, no provider wiring, no connect button to build.

### When to use

* You want the fastest path to a working swap widget.
* Your app doesn't already have wallet infrastructure.
* You're building a standalone page or prototype.

### Limitations

* **No NEAR or TON wallet support.** If your users need to swap from NEAR or TON wallets, use external mode.
* **Less UI control.** The wallet modal is provided by AppKit and you can't replace it with your own.
* **The `connectedWallets` prop is ignored.** In standalone mode, the widget uses the address from its own wallet connection.

## External Wallet Connection

This is the default mode. You manage the wallet connection on your side (using whatever library you prefer) and pass the connected addresses and providers to the widget.

### Key props

* **`connectedWallets`** — A map of wallet addresses keyed by chain (e.g. `{ default: '0x...', ton: 'UQ...' }`). The widget looks up the address for the selected token's chain, falling back to the `default` key.
* **`providers`** — The signing providers the widget uses to execute transactions. Accepts `evm`, `sol`, and `near` keys.
* **`onWalletSignin`** — Called when the user taps the action button while disconnected. Use this to trigger your own connect flow.
* **`onWalletSignout`** — Called when the widget needs to disconnect the wallet (e.g. during an incompatible-wallet check).

See the [Configuration](<README (1).md>) page for the full reference on each prop.

### EVM example

```tsx
import {
  WidgetConfigProvider,
  Widget,
} from '@aurora-is-near/intents-swap-widget';

export default function App() {
  const { address, connect, disconnect } = useYourEvmWallet();

  return (
    <WidgetConfigProvider
      config={{
        appName: 'MyApp',
        connectedWallets: { default: address },
        providers: { evm: window.ethereum },
        onWalletSignin: connect,
        onWalletSignout: disconnect,
      }}
    >
      <Widget />
    </WidgetConfigProvider>
  );
}
```

### Solana example

```tsx
const { publicKey, signMessage, signTransaction } = useYourSolanaWallet();

const config = {
  appName: 'MyApp',
  connectedWallets: { default: publicKey?.toBase58() },
  providers: {
    sol: { publicKey, signMessage, signTransaction },
  },
  onWalletSignin: connect,
  onWalletSignout: disconnect,
};
```

### Solana example with Privy

[Privy](https://docs.privy.io/) wallets don't expose `signMessage` and `signTransaction` in the same shape the widget expects, so you need a small adapter. Here's a complete example:

```tsx
import { type Providers } from '@aurora-is-near/intents-swap-widget';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

function solanaProviderFromPrivy(
  privyWallet: PrivySolanaWallet,
): NonNullable<Providers['sol']> {
  const account = privyWallet.standardWallet.accounts.find(
    (a) => a.address === privyWallet.address,
  );

  return {
    publicKey: account?.publicKey
      ? new PublicKey(account.publicKey)
      : undefined,

    signMessage: async (message) => {
      const result = await privyWallet.signMessage({ message });
      return result.signature;
    },

    signTransaction: async (transaction) => {
      if (transaction instanceof VersionedTransaction) {
        const result = await privyWallet.signTransaction({
          transaction: transaction.serialize(),
        });
        return VersionedTransaction.deserialize(result.signedTransaction);
      }

      const result = await privyWallet.signTransaction({
        transaction: transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        }),
      });
      return Transaction.from(result.signedTransaction);
    },
  } as NonNullable<Providers['sol']>;
}
```

Then pass it into the config:

```tsx
const config = {
  appName: 'MyApp',
  connectedWallets: { default: privyWallet.address },
  providers: {
    sol: solanaProviderFromPrivy(privyWallet),
  },
  onWalletSignin: connect,
  onWalletSignout: disconnect,
};
```

### NEAR example

```tsx
const nearWallet = useYourNearWallet();

const config = {
  appName: 'MyApp',
  connectedWallets: { default: nearWallet.accountId },
  providers: {
    near: () => nearWallet,
  },
  onWalletSignin: connect,
  onWalletSignout: disconnect,
};
```

### Multi-chain example

If your app supports multiple chains at once, pass all connected addresses and providers together:

```tsx
const config = {
  appName: 'MyApp',
  connectedWallets: {
    default: evmAddress,
    sol: solanaAddress,
    near: nearAccountId,
    ton: tonAddress,
  },
  providers: {
    evm: window.ethereum,
    sol: { publicKey, signMessage, signTransaction },
    near: () => nearWallet,
  },
  onWalletSignin: openWalletModal,
  onWalletSignout: disconnect,
};
```

The widget resolves which address to use based on the selected token's chain. If a chain-specific address isn't found, it falls back to `default`.

### When to use

* Your app already manages wallet connections (e.g. via AppKit, Privy, TonConnect, or a custom setup).
* You need NEAR or TON wallet support.
* You want full control over the connect/disconnect UI.
* You're building a multi-chain app where different wallets cover different chains.

## Choosing the Right Approach

**Start with built-in** if you just want a working widget with minimal code and don't need NEAR or TON wallets. You can always switch to external later.

**Use external** if any of these apply:

* You already have a wallet connection flow in your app.
* You need NEAR or TON chain support.
* You want to control which wallet modal appears and when.
* You're connecting multiple wallets for different chains.

Both approaches use the same widget components — the only difference is who manages the wallet lifecycle.
