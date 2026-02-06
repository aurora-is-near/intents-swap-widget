# Troubleshooting

This guide covers common issues when integrating the Intents Swap Widget.

If you can't find an answer here, please [open an issue](https://github.com/aurora-is-near/intents-swap-widget/issues) or reach out to the team.

## Table of Contents

- [Balance Loading Issues](#balance-loading-issues)
- [Dependency Conflicts](#dependency-conflicts)
- [Wallet Connection Problems](#wallet-connection-problems)
- [Token and Chain Filtering](#token-and-chain-filtering)
- [Configuration Errors](#configuration-errors)

## Balance Loading Issues

### Balances load infinitely

**Causes & Solutions:**

1. **Missing API key** - The widget will try to use a set of RPCs by default, but Alchemy is more reliable and you can have better control with Alchemy API key.
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

4. **RPC endpoint issues** - The widget retries failed RPC calls twice before giving up. If balances still fail, check network connectivity and RPC availability.

## Dependency Conflicts

### Conflicting package versions

**Cause:** The widget uses several libraries that your project may also use. When versions differ, bundlers may include multiple versions causing conflicts.

**Solution:** Add resolutions to your `package.json` to lock versions, example:

```json
"resolutions": {
  "valtio": "2.1.7",
  "valtio-fsm": "1.0.0",
  "@noble/curves": "^1.6.0",
  "@noble/hashes": "^1.5.0",
  "strip-ansi": "6.0.1",
  "@reown/appkit": "1.8.17",
  "@reown/appkit-common": "1.8.17",
  "@reown/appkit-controllers": "1.8.17",
  "@reown/appkit-pay": "1.8.17",
  "@reown/appkit-polyfills": "1.8.17",
  "@reown/appkit-scaffold-ui": "1.8.17",
  "@reown/appkit-ui": "1.8.17",
  "@reown/appkit-utils": "1.8.17",
  "@reown/appkit-wallet": "1.8.17",
  "@solana/addresses": "5.5.1",
  "@solana/codecs-core": "5.5.1",
  "@solana/errors": "5.5.1",
  "@solana/keys": "5.5.1"
}
```

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

   // For NEAR wallets
   providers={{ near: () => nearWallet }}
   ```

2. **Verify `walletSupportedChains`** - This must include chains your wallet actually supports:
   ```tsx
   walletSupportedChains={['eth', 'base', 'arbitrum']}
   ```

## Token and Chain Filtering

### Tokens not appearing in list

**Causes:**
- Token filtered by `allowedTokensList` or `filterTokens`
- Token not available on the selected chain
- `showIntentTokens` set to false

**Solutions:**

1. Check your filter configuration:
   ```tsx
   // Allow all tokens (remove filtering)
   allowedTokensList={undefined}
   filterTokens={undefined}

   // Or explicitly include the token
   allowedTokensList={['usdc', 'eth', 'near']}
   ```

2. Enable intent tokens if needed:
   ```tsx
   showIntentTokens={true}
   ```

### Chains not appearing

**Cause:** Chain filtered by `allowedChainsList` or related props.

**Solution:** Check your chain filter configuration:
```tsx
allowedChainsList={['eth', 'base', 'near', 'solana']}
// Or for directional filtering:
allowedSourceChainsList={['eth', 'base']}
allowedTargetChainsList={['near']}
```

## Configuration Errors

### No styles/broken design

**Cause:** Missing CSS imports.

**Solution:** Import required CSS files:

```tsx
import '@aurora-is-near/intents-swap-widget/styles.css';
import '@aurora-is-near/intents-swap-widget/theme.css';
```

### Theme not applying

**Cause:** Theme parent element not found.

**Solution:** Ensure `themeParentElementSelector` points to a valid element:
```tsx
themeParentElementSelector="#my-app-container"
```

## Still Having Issues?

If this guide didn't solve your problem:

1. Check the [GitHub Issues](https://github.com/aurora-is-near/intents-swap-widget/issues) for similar problems
2. Open a new issue with:
   - Widget version
   - Your configuration (remove sensitive keys)
   - Error messages from the console
   - Steps to reproduce
