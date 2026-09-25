---
icon: code
description: "@aurora-is-near/intents-connect: the headless client and execution runner."
---

# TypeScript SDK

> **Beta.** Part of the [Intents Connect SDK](../README.md).

`@aurora-is-near/intents-connect` is a headless client for the Intents Connect API. You write a **recipe** (the steps to run on the destination chain). The **runner** takes a recipe plus a quote and drives the whole execution, from intermediary lookup to `SUCCESS`.

| | |
|---|---|
| **Entry points** | `@aurora-is-near/intents-connect` (core) · `@aurora-is-near/intents-connect/react` (hooks) |
| **Runtime deps** | `valtio`, `@scure/base`. No chain SDKs |
| **Peer deps** | `react >=18.2`, optional and only needed for `/react` |
| **Format** | ESM only |
| **Wallets** | Bring your own `WalletConnector`, or use [`intents-connect-wallet`](../wallet-integrations.md) |

## Install

```bash
npm install @aurora-is-near/intents-connect
# ready-made wallets + deposit transfers (recommended)
npm install @aurora-is-near/intents-connect-wallet
```

## Quick start

```ts
import {
  createIntentsConnectApi,
  createExecutionRunner,
  type Recipe,
} from '@aurora-is-near/intents-connect';

const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base

// 1. Describe the steps. `amount` is opaque: template it, never inspect it.
const supply: Recipe<{ pool: string }> = {
  id: 'aave-supply',
  intent: 'aave_supply',
  title: 'Supply to Aave',
  flow: 'bridge-in',
  type: 'evm',
  destination: { chain: 'base', assetId: 'nep141:base-…', tokenAddress: USDC },
  buildSteps: ({ intermediary, amount }, { pool }) => [
    { to: USDC, functionSignature: 'approve(address,uint256)',
      parameters: [pool, amount], value: '0' },
    { to: pool, functionSignature: 'supply(address,uint256,address,uint16)',
      parameters: [USDC, amount, intermediary, '0'], value: '0' },
  ],
};

// 2. Create the API client and a runner bound to the user's wallet.
const runner = createExecutionRunner({
  api: createIntentsConnectApi({
    baseUrl: 'https://intents-connect-alpha-api.aurora.dev',
    apiKeyProxyUrl: '/api/intents-connect', // your server adds x-api-key
  }),
  wallet: connector, // a WalletConnector, see Wallet integrations
  onEvent: (event) => console.log(event),
});

// 3. Run it: sign → deposit → bridge → steps → SUCCESS.
const execution = await runner.run({
  recipe: supply,
  params: { pool: '0x…' },
  quote: {
    originAsset, destinationAsset, amount, // atomic units
    swapType: 'EXACT_INPUT', slippageTolerance: 100, // bps
  },
  originChain: 'base',
  originToken: { contractAddress: USDC, decimals: 6 },
  depositViaWallet: true, // false = show a deposit address / QR instead
});
```

> **Keep the API key off the client.** In browsers, pass `apiKeyProxyUrl` and not `apiKey`. The two create calls go to your proxy, which adds the `x-api-key` header. All other calls go straight to `baseUrl`.

## What you provide

| You provide | Why | Where |
|---|---|---|
| API access | `baseUrl` + `apiKey` (server) or `apiKeyProxyUrl` (browser) | `createIntentsConnectApi` |
| A `WalletConnector` | Address, signing standard and providers of the user's wallet | [Wallet integrations](../wallet-integrations.md) |
| A deposit transfer | Only when `depositViaWallet: true` | `wallet.makeTransfer` or transfer plugins |
| A recipe | The on-chain steps and the destination asset | [Recipes & fees](recipes-and-fees.md) |
| A quote | Origin and destination assets, amount, slippage | `plan.quote` |

## Runner methods

| Method | Use it to |
|---|---|
| `preview(plan)` | Dry-run a bridge-in: fee, spendable amount, frozen steps. No side effects |
| `run(plan)` | Execute a bridge-in end to end. Resolves on a terminal status |
| `previewSteps(plan)` / `runSteps(plan)` | Same pair for **steps-only** executions (no bridge, funds already in the intermediary) |
| `resume(executionId, options?)` | Continue an execution after a reload, a timeout or a lost tab |
| `retryDeposit()` | Retry the wallet transfer after the user rejected it |
| `cancel(executionId?)` | Sign `delete_execution:{id}` and delete the execution |
| `getPhase()` / `getStore()` | Read state: the current phase, or the full valtio store |
| `dispose()` | Stop polling and release the runner |

Only one flow runs per runner at a time. Details: [Lifecycle & errors](lifecycle-and-errors.md).

## Signing standards

The origin wallet signs, whatever the destination chain is.

| Standard | Origin wallet | Status |
|---|---|---|
| `erc191` | EVM (`personal_sign`) | ✅ |
| `raw_ed25519` | Solana | ✅ |
| `nep413` | NEAR | ✅ |
| `sep53` | Stellar | ✅ (can't be cancelled client-side, clears on expiry) |
| `tip191` / `ton_connect` | Tron / TON | ❌ not yet |

## SDK → HTTP API

Every call maps to an endpoint in the [Intents Connect API Reference](https://docs.intents.aurora.dev/api-reference/intents-connect-api-reference).

| `api.` method | Endpoint | Reference |
|---|---|---|
| `getIntermediary(wallet)` | `GET /api/v1/executions/{wallet}/intermediary` | [Fetch intermediary accounts](https://docs.intents.aurora.dev/api-reference/intents-connect-api-reference/fetch-intermediary-accounts) |
| `createExecution(wallet, body)` 🔑 | `POST /api/v1/executions/{wallet}` | [Request an execution](https://docs.intents.aurora.dev/api-reference/intents-connect-api-reference/request-an-execution) |
| `createStepsExecution(wallet, body)` 🔑 | `POST /api/v1/executions/{wallet}/steps` | [Request steps execution](https://docs.intents.aurora.dev/api-reference/intents-connect-api-reference/request-steps-execution) |
| `submitSignature(wallet, body)` | `POST /api/v1/executions/{wallet}/submit` | [Submit digest](https://docs.intents.aurora.dev/api-reference/intents-connect-api-reference/submit-digest) |
| `recordDeposit(body)` | `POST /api/v1/executions/deposit/submit` | [Submit deposit hash](https://docs.intents.aurora.dev/api-reference/intents-connect-api-reference/submit-deposit-hash) |
| `listExecutions(wallet, query)` | `GET /api/v1/executions/{wallet}` | [Fetch executions](https://docs.intents.aurora.dev/api-reference/intents-connect-api-reference/fetch-executions) |
| `deleteExecution(wallet, id, sig)` | `DELETE /api/v1/executions/{wallet}/{id}` | [Delete an execution](https://docs.intents.aurora.dev/api-reference/intents-connect-api-reference/delete-an-execution) |
| `listSupportedTokens(flow?)` | `GET /api/v1/supported_tokens` | [List supported tokens](https://docs.intents.aurora.dev/api-reference/intents-connect-api-reference/list-supported-tokens) |

🔑 = sends `x-api-key`, or goes through `apiKeyProxyUrl`.

## Next

- [Recipes & fees](recipes-and-fees.md): step shape, placeholders, fee strategies
- [Lifecycle & errors](lifecycle-and-errors.md): phases, events, recovery
- [React](react.md): `IntentsConnectProvider` and `useExecution`
- [Examples](../examples/README.md): real integrations, end to end
- [Package README](https://github.com/aurora-is-near/intents-swap-widget/tree/main/packages/intents-connect) · [npm](https://www.npmjs.com/package/@aurora-is-near/intents-connect)
