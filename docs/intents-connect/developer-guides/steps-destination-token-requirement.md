---
icon: book-open
---

# Steps destination token requirement

`POST /api/v1/executions/{wallet}/steps` requires that **at least one step calls the `destinationAsset` token contract**. If none of your steps touch it, the request is rejected. This guide explains the rule, why it exists, and the zero-value-transfer workaround for steps that legitimately never touch the payout token.

### The rule

For an ERC-20 `destinationAsset`, the `to` field of at least one step must equal the destination token's contract address. Otherwise the request fails:

```json
{ "error": "steps must include at least one call to destination token 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" }
```

**Native** destination assets (the gas token of the chain) are exempt — the fee is taken in native value, so no token call is required.

### Why

The network/gas fee for a steps execution is collected **in the destination token**. The backend appends a fee-transfer step that moves the gas fee from the intermediary's destination-token balance to the fee collector. The guard ensures the step set actually engages that token. Two consequences follow:

1. **At least one step must call the destination token** — otherwise the request is rejected before it runs.
2. **The intermediary must hold enough destination token to cover the gas fee** — the appended fee-transfer step spends from its balance. A step set that passes the guard but leaves the intermediary with no destination-token balance will fail at execution time.

### Workaround — append a zero-value transfer

When your real steps don't touch the payout token (for example, an async request that only calls a vault), satisfy the guard by adding a final step that transfers `0` of the destination token to the intermediary account:

```json
{
  "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "value": "0",
  "functionSignature": "transfer(address,uint256)",
  "parameters": ["<intermediaryAddress>", "0"]
}
```

* `to` is the destination token contract (here, USDC on Base).
* The recipient is the intermediary account — fetch it from `GET /api/v1/executions/{wallet}/intermediary` → `{ "evm": "0x…" }`.
* The amount is `0`, so this moves no funds; it exists only to reference the destination token and clear the guard.

### Full example

A complete `/steps` body whose real work (an `approve` + a request call) never touches the payout token, with the zero-value transfer appended last:

```json
{
  "version": "1.0",
  "type": "evm",
  "destinationAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
  "steps": [
    {
      "to": "0x1111111111111111111111111111111111111111",
      "value": "0",
      "functionSignature": "approve(address,uint256)",
      "parameters": ["0x2222222222222222222222222222222222222222", "1000000000000000000"]
    },
    {
      "to": "0x2222222222222222222222222222222222222222",
      "value": "0",
      "functionSignature": "requestRedeem(address,uint256)",
      "parameters": ["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "1000000000000000000"]
    },
    {
      "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "value": "0",
      "functionSignature": "transfer(address,uint256)",
      "parameters": ["0x3eb032bca9a6ceeb8ce69fdf4ec79187fdddd25e", "0"]
    }
  ],
  "metadata": { "title": "Request redeem", "intent": "async_redeem" },
  "dry": false
}
```

The first two steps do the actual work; the third (a `0`-amount transfer of USDC to the intermediary) only exists to satisfy the destination-token guard.

### Prerequisite

The zero-value transfer clears the guard, but it does **not** fund the gas fee. The intermediary must separately hold a balance of the destination token large enough to cover the appended fee-transfer step. This is especially relevant for asynchronous flows, where the payout token only arrives after settlement — the intermediary needs a pre-existing balance to pay gas at trigger time
