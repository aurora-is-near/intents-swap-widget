---
icon: grip
---

# Widgets

The **Intents Swap Widget** package exports multiple pre-built widget components, `Widget`, `WidgetSwap`, `WidgetWithdraw` and `WidgetDeposit`.

The `Widget` component is the one you will want to use in most cases. The others being used when you want to build more specific UIs.

By default `Swap` mode is active when widget is rendered. You can change this by passing the `defaultMode` property to the `Widget` component.

### Usage

In their most basic form, all of these components can be rendered with no additional properties, for example:

```tsx
import { Widget } from '@aurora-is-near/intents-swap-widget';

<Widget />
```

As well as the global configuration properties provided via the `WidgetConfigProvider` (see Configuration), the widgets each accept a number of properties.

### Making transfers

The package will make EVM and Solana transfers by default. If you want to implement your own custom transfer logic you can pass in a `makeTransfer` function as widget property.

The function is called with an object that contains details about the transaction, which is typed like this:

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

Your `makeTransfer` function should return the transaction `hash` and a `transactionLink`, which are used when displaying the transfer success screen.

#### Example

```tsx
  <Widget
    makeTransfer={(args) => {
      const hash = performTonSwap(args);

      return {
        hash: hash,
        transactionLink: `https://tonviewer.com/transaction/${hash}`,
      }
    }}
  />
```

The `makeTransfer` function is called with a second argument that defines the widget type. This can be useful if you have enabled account abstraction and need to modify the transfer behaviour in some way, or log analytics events, based on the widget type (i.e. swap, deposit or withdraw).

### Listen to events

Each `Widget` component exposes `onMsg` prop that allows you to listen to some events in the transfer pipeline. E.g. widget deposit mode component has the following events exposed that can be used like:

```tsx
<Widget onMsg={msg => {
    switch (msg.type) {
        case 'on_select_token':
        case 'on_change_deposit_type':
        case 'on_tokens_modal_toggled':
            break
        case 'on_transfer_success':
            // you can access event's data here e.g. transaction hash
            console.log(msg.hash)
            break;
        default:
            break;
    }
}} />
```

For events of other widget types please refer to their `Props` type.
