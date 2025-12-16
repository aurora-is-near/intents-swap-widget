# Widgets

The **Intents Swap Widget** package exports multiple pre-built widget components,
`WidgetSwap`, `WidgetWithdraw` and `WidgetDeposit`.

## Usage

In their most basic form, all of these components can be rendered with no
additional properties, for example:

```tsx
import { WidgetSwap } from '@aurora-is-near/intents-swap-widget';

<WidgetSwap />
```

As well as the global configuration properties provided via the
`WidgetConfigProvider` (see [Configuration](./configuration.md)), the widgets
each accept a number of properties.

## Making transfers

The package will make EVM and Solana transfers by default. If you want to
implement your own custom transfer logic you can pass in a `makeTransfer`
function as widget property.

The function is called with an object that contains details about the transaction,
which is typed like this:

```ts
export type MakeTransferArgs = {
  amount: string;
  decimals: number;
  address: string;
  tokenAddress?: string;
  chain: Chains;
  evmChainId: number | null;
  isNativeEvmTokenTransfer: boolean;
  sourceAssetId: string;
  targetAssetId: string;
};
```

It should return the transaction `hash` and a `transactionLink`.

### Example

```tsx
  <WidgetSwap
    makeTransfer={(args) => {
      const hash = performTonSwap(args);

      return {
        hash: hash,
        transactionLink: `https://tonviewer.com/transaction/${hash}`,
      }
    }}
  />
```
