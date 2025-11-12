# Theming

The **Intents Swap Widget** can be themed in two main ways.

## Theme Object (Recommended)

The easiest way to theme the widget is by providing a `theme` object to the
`WidgetConfigProvider`.

This automatically generates a full theme based on a small set of core colors.

### Example

```tsx
import { WidgetConfigProvider, WidgetSwap } from '@aurora-is-near/intents-swap-widget';

export default function App() {
  return (
    <WidgetConfigProvider
      config={{
        appName: 'My App',
        theme: {
          colorScheme: 'dark',
          backgroundColor: '#1E2337',
          primaryColor: '#0098EA',
        },
      }}
    >
      <WidgetSwap />
    </WidgetConfigProvider>
  );
}
```

### Properties

| Property          | Type                 | Description                                                       |
| ----------------- | -------------------- | ----------------------------------------------------------------- |
| `colorScheme`     | `'light'` | `'dark'` | Sets the overall color scheme                                     |
| `backgroundColor` | `string`             | The background color of the widget                                |
| `primaryColor`    | `string`             | Main accent color used for highlights, buttons, and active states |

## CSS Variable Overrides (Advanced)

If you want to get even more granular, you can override the widget’s CSS variables
directly. This method gives you complete control over colors, typography, spacing,
borders, and fonts.

Our package uses Tailwind, but your app doesn't have to. The package exposes
CSS variables to control styling, with each variable and its corresponding
Tailwind token using the `sw-` prefix to avoid conflicts with your app's theme
and variables.

To adjust theme, override these CSS variables in your app's stylesheet. The full
list of available variables can be found at
[`packages/intents-swap-widget/src/theme.css`](https://github.com/aurora-is-near/intents-swap-widget/blob/main/packages/intents-swap-widget/src/theme.css)

### Example

```css
@import '@aurora-is-near/intents-swap-widget/styles.css';

:root {
  /* Colors */
  --sw-gray-50: #ebedf5;
  --sw-gray-100: #b2b5c1;

  /* Spacing */
  --sw-space-xs: 2px;
  --sw-space-s: 4px;

  /* Border radius */
  --sw-radius-s: 4px;
  --sw-radius-m: 8px;

  /* Typography */
  --sw-font-sans: 'Inter', sans-serif;
  --sw-font-mono: 'JetBrains Mono', monospace;
}
```
