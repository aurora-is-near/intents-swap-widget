# Wallet Connection

The **Intents Swap Widget** needs access to a wallet to sign transactions and
fetch balances. You choose how that wallet connection happens: either the widget
manages it for you, or you handle it yourself and pass the details in.

## Two Approaches

| | Built-in | External |
|---|---|---|
| **How it works** | Widget opens its own wallet modal (via AppKit) | You connect the wallet and pass addresses + providers to the widget |
| **Enable with** | Install `@aurora-is-near/intents-swap-widget-standalone` | Pass `connectedWallets`, `providers`, and `plugins` (default behavior) |
| **Supported chains** | EVM (Ethereum, Arbitrum, Polygon, BSC, Optimism, Avalanche, Base) + Solana + Stellar | Any chain the widget supports, including NEAR and TON |
| **Setup effort** | Minimal | More code, but more control |

## Built-in Wallet Connection

Install `@aurora-is-near/intents-swap-widget-standalone` (instead of `@aurora-is-near/intents-swap-widget`)
and the widget will render its own connect-wallet button.

Under the hood it uses [AppKit by Reown](https://docs.reown.com/appkit/overview)
to present a wallet modal supporting 50+ wallets via WalletConnect, plus Phantom
and Solflare for Solana, [Stellar Wallets Kit](https://stellarwalletskit.dev/)
for Stellar, and [NEAR Connect](https://www.npmjs.com/package/@hot-labs/near-connect)
for NEAR.

### Supported chains

Ethereum, Arbitrum, Polygon, BSC, Optimism, Avalanche, Base, Solana, Stellar,
and NEAR.

### Code example

```tsx
import {
  WidgetConfigProvider,
  Widget,
} from '@aurora-is-near/intents-swap-widget-standalone';

export default function App() {
  return (
    <WidgetConfigProvider>
      <Widget />
    </WidgetConfigProvider>
  );
}
```

That's it. No wallet hooks, no provider wiring, no connect button to build. The
standalone package wires up the network plugins for EVM, Solana, and Stellar
internally.

### When to use

- You want the fastest path to a working swap widget.
- Your app doesn't already have wallet infrastructure.
- You're building a standalone page or prototype.

### Limitations

- **No TON wallet support.** If your users need to swap from TON wallets, use
  external mode.
- **Less UI control.** The wallet modals are provided by AppKit, Stellar
  Wallets Kit, and NEAR Connect and you can't replace them with your own.
- **The `connectedWallets` prop is ignored.** In standalone mode, the widget
  uses the address from its own wallet connection.

## External Wallet Connection

This is the default mode when installing the `@aurora-is-near/intents-swap-widget`
package. You manage the wallet connection on your side (using whatever library you
prefer) and pass the connected addresses, raw wallet providers, and chain
network plugins to the widget.

### Key props

- **`connectedWallets`** — A map of wallet addresses keyed by chain (e.g.
  `{ default: '0x...', ton: 'UQ...' }`). The widget looks up the address for
  the selected token's chain, falling back to the `default` key.
- **`providers`** — The signing providers the widget uses to execute
  transactions. Accepts `evm`, `sol`, `stellar` and `near` keys.
- **`plugins`** — A network plugin per chain you want to support for transfers.
- **`onWalletSignin`** — Called when the user taps the action button while
  disconnected. Use this to trigger your own connect flow.
- **`onWalletSignout`** — Called when the widget needs to disconnect the wallet
  (e.g. during an incompatible-wallet check).

See the [Configuration](./configuration.md) page for the full reference on each
prop.

### EVM example

```tsx
import {
  WidgetConfigProvider,
  Widget,
} from '@aurora-is-near/intents-swap-widget';
import { evm } from '@aurora-is-near/intents-swap-widget-evm';

export default function App() {
  const { address, connect, disconnect } = useYourEvmWallet();

  return (
    <WidgetConfigProvider
      config={{
        connectedWallets: { default: address },
        providers: { evm: window.ethereum },
        plugins: { evm },
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
import { sol } from '@aurora-is-near/intents-swap-widget-solana';

const { publicKey, signMessage, signTransaction } = useYourSolanaWallet();

const config = {
  connectedWallets: { default: publicKey?.toBase58() },
  providers: {
    sol: { publicKey, signMessage, signTransaction },
  },
  plugins: { sol },
  onWalletSignin: connect,
  onWalletSignout: disconnect,
};
```

### Solana example with Privy

[Privy](https://docs.privy.io/) wallets don't expose `signMessage` and
`signTransaction` in the same shape the widget expects, so you need a small
adapter. Here's a complete example:

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

Then pass it into the config along with the network plugin:

```tsx
const config = {
  connectedWallets: { default: privyWallet.address },
  providers: {
    sol: solanaProviderFromPrivy(privyWallet),
  },
  plugins: { sol },
};
```

### Stellar example

```tsx
import { stellar } from '@aurora-is-near/intents-swap-widget-stellar';

const stellarWallet = useYourStellarWallet();

const config = {
  connectedWallets: { default: stellarWallet.address },
  providers: {
    stellar: {
      publicKey: stellarWallet.address,
      signMessage: stellarWallet.signMessage,
      signTransaction: stellarWallet.signTransaction,
    },
  },
  plugins: { stellar },
  onWalletSignin: connect,
  onWalletSignout: disconnect,
};
```

### NEAR example

```tsx
const nearWallet = useYourNearWallet();

const config = {
  connectedWallets: { default: nearWallet.accountId },
  providers: {
    near: () => nearWallet,
  },
  onWalletSignin: connect,
  onWalletSignout: disconnect,
};
```

### Multi-chain example

If your app supports multiple chains at once, pass all connected addresses and
providers together:

```tsx
const config = {
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

The widget resolves which address to use based on the selected token's chain.
If a chain-specific address isn't found, it falls back to `default`.

### When to use

- Your app already manages wallet connections (e.g. via AppKit, Privy,
  TonConnect, or a custom setup).
- You need TON wallet support.
- You want full control over the connect/disconnect UI.
- You're building a multi-chain app where different wallets cover different
  chains.
- You want to keep your bundle small by only including support for the chains
  you actually support.

## Choosing the Right Approach

**Start with built-in** if you just want a working widget with minimal code and
don't need TON wallets. You can always switch to external later.

**Use external** if any of these apply:

- You already have a wallet connection flow in your app.
- You need TON chain support.
- You want to control which wallet modal appears and when.
- You're connecting multiple wallets for different chains.
- You want fine-grained control over which chain SDKs are bundled.

Both approaches use the same widget components — the only difference is who
manages the wallet lifecycle.
