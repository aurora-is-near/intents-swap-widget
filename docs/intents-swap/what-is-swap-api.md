---
description: >-
  Programmatic cross-chain swaps for wallets, backends and agents. Same engine
  as the Swap Widget, no UI required.
icon: gear-api
---

# What is Swap API?

The Swap API is the REST interface behind Aurora Intents swaps. It is the same engine that powers the Swap Widget and Intents Deposits, exposed directly so you can run cross-chain swaps from your own UI, your backend, or an automated agent, with no iframe, no bridging logic and no liquidity to manage.

### When to use the Swap API

Choose the API over the Swap Widget when you need:

* Your own swap UI, e.g. a wallet or exchange that already has a swap screen
* Headless or server-side flows: treasury rebalancing, trading bots, AI agents, payment backends
* Full control over quoting, slippage, refunds and recipient handling
* Swaps that settle into a different address than the sender, e.g. a user deposits on chain A and your protocol receives on chain B

If you just want a drop-in swap screen with no code, use the [Swap Widget](what-is-swap-widget.md) instead. Both use the same API key, fee configuration and reports in Intents Studio.

### How it works

Every swap follows the same four steps. There is no on-chain approval or contract call on your side: the user (or your backend) simply sends the origin asset to a deposit address returned by the quote.

1. Get supported tokens. Call GET /api/tokens/{apiKey} to list the assets and chains available to your key, and pick the origin and destination asset IDs.
2. Request a quote. Call POST /api/quote/{apiKey} with the amount, assets, slippage, recipient and refund address. The response contains amountOut, minAmountOut, a time estimate, a deadline, and a unique depositAddress (plus depositMemo on memo-based chains).
3. Send the origin asset. Transfer amountIn to depositAddress from any wallet before the deadline. Optionally call POST /api/deposit/submit/{apiKey} with the transaction hash to speed up detection.
4. Track the swap. Poll GET /api/status/{apiKey}?depositAddress=... until the status is SUCCESS, REFUNDED or FAILED. Use GET /api/transactions/{apiKey} for history and GET /api/incidents/{apiKey} to surface active chain or asset incidents to your users.

### Base URL and authentication

All endpoints live under https://intents-api.aurora.dev. Authentication uses an API key passed as a path segment on every request. Create a key in Intents Studio (studio.aurora.dev); the key is not secret and is safe to ship in client-side code. Each key has its own fee configuration, so you can earn fees on API swaps the same way you do with the widget. See API Keys & Fees and Rate Limits for details.

### Example: quote a swap

Swap 100 USDC on one chain for USDC on another, delivered to a recipient of your choice. Set dry to true to get a price without reserving a deposit address.

```
curl -X POST https://intents-api.aurora.dev/api/quote/{apiKey} \
  -H "Content-Type: application/json" \
    -d '{
      "dry": false,
      "swapType": "EXACT_INPUT",
      "depositType": "ORIGIN_CHAIN",
      "originAsset": "<asset id from /api/tokens>",
      "destinationAsset": "<asset id from /api/tokens>",
      "amount": "100000000",
      "slippageTolerance": 100,
      "refundTo": "<sender address on the origin chain>",
      "refundType": "ORIGIN_CHAIN",
      "recipient": "<recipient address on the destination chain>",
      "recipientType": "DESTINATION_CHAIN"
  }'
```

### Swap types

The swapType field controls how amount is interpreted:

* EXACT\_INPUT: amount is what the user sends; the output floats with the market. The default for a classic swap screen.
* EXACT\_OUTPUT: amount is what the recipient must receive; the API tells you how much to send. Use it for invoices, top-ups and fixed-price checkouts.
* FLEX\_INPUT: like EXACT\_INPUT, but the deposit may differ from the quoted amount and the swap still executes on what actually arrives.
* ANY\_INPUT: no amount up front; whatever lands on the deposit address is swapped. This is what powers Intents Deposits and Persistent Addresses.

Deposits can be made from the origin chain (ORIGIN\_CHAIN) or from an existing NEAR Intents balance (INTENTS). Set confidentiality to basic or advanced for Confidential Swaps.

### Next steps

* Create an API key in Intents Studio and configure your fees: [API Keys & Fees](../getting-started/api-keys-and-fees.md)
* Full endpoint schemas and error codes: [Swap API Reference](../api-reference/swap-api-reference/)
* A step-by-step walkthrough of the same flow for deposits: [Intents Deposits API integration](../intents-deposits/quickstart/api-integration.md)
* Rate limits, UX recommendations and support handling: [Integration Best Practices](../getting-started/integration-best-practices/)
