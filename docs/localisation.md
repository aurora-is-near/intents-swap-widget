# Localisation

The **Intents Swap Widget** allows you to override any piece of text used
within the interface. This lets you customise copy for your app’s tone of voice,
or translate labels into other languages.

To change the copy used inside the widget, pass a `localisation` object to the
`WidgetConfigProvider`. Each key corresponds to a text label or message within
the widget.

The full
list of available variables can be found at
[`packages/intents-swap-widget/src/types/localisation.ts`](https://github.com/aurora-is-near/intents-swap-widget/blob/main/packages/intents-swap-widget/src/types/localisation.ts)

### Example

```tsx
import { WidgetConfigProvider, WidgetSwap } from '@aurora-is-near/intents-swap-widget';

export default function App() {
  return (
    <WidgetConfigProvider
      localisation={{
        'quote.result.maxSlippage.label': 'MAX',
        'submit.active.swap': 'Swap now',
      }}
    >
      <WidgetSwap />
    </WidgetConfigProvider>
  );
}
```
