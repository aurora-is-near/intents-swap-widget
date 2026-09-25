---
icon: rocket
description: Real Intents Connect SDK integrations from the demo app, end to end.
---

# Examples

> **Beta.** Part of the [Intents Connect SDK](../README.md).

Each example is a working integration from the [Intents Connect demo](https://github.com/aurora-is-near/intents-swap-widget/tree/main/apps/intents-connect-demo). Every page follows the same layout: what it does, what the user does, what happens behind the scenes, and the core SDK code.

| Example | Destination | What the user gets | SDK features shown |
|---|---|---|---|
| [Hydrex](hydrex.md) | Base | A cbETH/WETH liquidity position (NFT) in their wallet | EVM recipe, native destination, placeholder fee |
| [Polymarket](polymarket.md) | Polygon | pUSD in their Polymarket account | EVM recipe, token destination, recipient inside the steps |
| [Solana (Jupiter)](solana-jupiter.md) | Solana | Any of 10 SPL tokens 1Click doesn't list | Solana recipe, `threeRound` fee, `preview`, steps-only sell and withdraw |

All three share the same setup:

```tsx
const api = createIntentsConnectApi({ baseUrl, apiKeyProxyUrl });
const { wallet } = useIntentsConnectWallet(); // EVM or Solana wallet, transfer wired in

<IntentsConnectProvider api={api} wallet={wallet}>
  <Tab /> {/* each tab: const exec = useExecution(); exec.run(plan) */}
</IntentsConnectProvider>;
```

The user can start from **any supported chain and token**. They either send from the connected wallet, or deposit to a shown address and QR code (`depositViaWallet: false`).

> Looking for Aave? See [Deposit into Aave from Solana](https://docs.intents.aurora.dev/intents-connect/examples/deposit-into-aave-from-solana), which uses the HTTP API directly.
