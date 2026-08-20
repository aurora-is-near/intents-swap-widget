# Troubleshooting

This guide covers common issues when integrating the Intents Swap Widget.

If you can't find an answer here, please [open an issue](https://github.com/aurora-is-near/intents-swap-widget/issues) or reach out to the team.

## Table of Contents

- [Balance Loading Issues](#balance-loading-issues)
- [Dependency Conflicts](#dependency-conflicts)
- [Wallet Connection Problems](#wallet-connection-problems)
- [Configuration Errors](#configuration-errors)

## Balance Loading Issues

### Balances load infinitely

**Causes & Solutions:**

1. **Missing API key** - Without an Alchemy API key, the widget uses its configured RPCs for balance loading. When an Alchemy key is provided, Alchemy becomes the exclusive balance source for the chains it supports; configured RPCs remain available for other chains.

   ```tsx
   <SwapWidget
     alchemyApiKey="your-alchemy-api-key"
     // ...other props
   />
   ```

2. **API rate limits** - Alchemy free tier has request limits. Check your Alchemy dashboard for quota usage.

3. **TON balances not loading** - TON requires a separate API key.

   ```tsx
   <SwapWidget
     tonCenterApiKey="your-toncenter-api-key"
     // ...other props
   />
   ```

4. **RPC endpoint issues** - The widget retries failed RPC calls twice before giving up. If balances still fail, check network connectivity and RPC availability. An Alchemy request failure does not automatically fan out to public RPCs.

## Dependency Conflicts

### Conflicting package versions

**Cause:** The widget uses several libraries that your project may also use. When versions differ, bundlers may include multiple versions causing conflicts.

**Solution:** Avoid blanket resolutions for transitive cryptography, wallet, or
connector packages. Those packages intentionally use multiple versions and may
not expose compatible APIs.

If your application installs a conflicting Valtio version, constrain only the
package with the demonstrated conflict:

```json
"resolutions": {
  "valtio": "2.1.7",
  "valtio-fsm": "1.0.0"
}
```

Do not globally resolve `@noble/hashes` or `@noble/curves`. Some wallet
dependencies require older, exact Noble APIs, while newer dependencies require
later versions. Let the package manager install those versions side by side.

For **Yarn**, resolutions work as shown above. For **npm** or **bun**, use `overrides` instead:

```json
"overrides": {
  "valtio": "2.1.7"
}
```

Please refer to your package manager documentation for ways of doing this:

- [npm](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
- [yarn](https://classic.yarnpkg.com/lang/en/docs/selective-version-resolutions/)
- [pnpm](https://pnpm.io/9.x/package_json#resolutions)

## Wallet Connection Problems

### Wallet not connecting

**Solutions:**

1. **Check provider configuration** - Ensure you're passing the correct provider for your account type:

   ```tsx
   // For EVM wallets
   providers={{ evm: window.ethereum }}

   // For Solana wallets
   providers={{ sol: solanaWallet }}

   // For Stellar wallets
   providers={{ stellar: stellarWallet }}

   // For NEAR wallets
   providers={{ near: () => nearWallet }}
   ```

2. **Add the matching network plugin** - For EVM, Solana, and Stellar swaps,
   you also need to install the relevant sibling package and register its
   network plugin via the `plugins` property.

   ```tsx
   import { evm } from '@aurora-is-near/intents-swap-widget-evm';
   import { sol } from '@aurora-is-near/intents-swap-widget-solana';
   import { stellar } from '@aurora-is-near/intents-swap-widget-stellar';

   <WidgetConfigProvider
     config={{
       plugins: { evm, sol, stellar },
       // ...
     }}
   >
   ```

  Errors like `No EVM transfer configured` mean the plugin is missing:

   Note that NEAR is built into widget core and does not need a plugin.

1. **Verify `walletSupportedChains`** - We will attempt to establish the supported chains based on the format of the wallet address, however, you may want to include chains your wallet supports:

   ```tsx
   walletSupportedChains={['eth', 'base', 'arb']}
   ```

## Configuration Errors

### No styles/broken design

**Cause:** Missing CSS imports.

**Solution:** Import required CSS files:

```tsx
import '@aurora-is-near/intents-swap-widget/styles.css';
```

Check our detailed [theming](./theming.md) documentation.

### Tailwind & CSS reset

If you use global CSS reset e.g.:

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
```

It will break widget's styles due to Tailwind layering system. If you face that
issue and see no paddings, margins or other style issues in a widget please
scope your CSS resetting styles with a `@layer base` as below:

```css
@layer base {
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
}
```

## Still Having Issues?

If this guide didn't solve your problem:

1. Check the [GitHub Issues](https://github.com/aurora-is-near/intents-swap-widget/issues) for similar problems
2. Open a new issue with:
   - Widget version
   - Your configuration (remove sensitive keys)
   - Error messages from the console
   - Steps to reproduce
