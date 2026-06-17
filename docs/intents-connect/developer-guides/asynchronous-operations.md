---
icon: book-open
---

# Asynchronous operations

Some on-chain operations don't settle in the transaction that triggers them. You submit a request now, and the funds it produces arrive at the intermediary account _later_ — minutes, hours, or even days afterwards. There is no way to say "do the request, wait for settlement, then bridge the result out" inside a single execution, so model it as **two separate executions**:

1. Trigger the async operation with `POST /api/v1/executions/{wallet}/steps`.
2. Once the settled funds (a 1Click-supported token) land at the intermediary, move them to another network with `POST /api/v1/executions/{wallet}`.

### TL;DR

1. **Trigger** — call `POST /api/v1/executions/{wallet}/steps` with the steps that submit the request (e.g. an `approve` + a request-redeem). No `x-api-key` is needed for this endpoint.
2. **Wait** — the operation settles off the critical path. When it does, the payout token (e.g. USDC — anything 1Click supports) arrives at the **intermediary account** on the destination chain.
3. **Move** — call `POST /api/v1/executions/{wallet}` with a quote and `outOperation: true` to bridge the settled funds to another network. This endpoint **requires** an `x-api-key` header.

### Why two executions

Request-style flows (request-then-redeem, queued withdrawals, epoch-based unstaking, …) only _enqueue_ the operation in the triggering transaction. The payout is produced asynchronously, so it cannot be bridged in the same transaction — at trigger time the funds don't exist yet.

The intermediary account is the constant across both executions: the trigger runs there, the settled funds arrive there, and the second execution spends from there. So you split the work along the settlement boundary — one execution to start the operation, a second one to move the result once it's real.

### The intermediary account

The intermediary is a deterministic EVM address derived from the wallet. It is where steps execute and where bridged or settled funds land on the destination chain. Fetch it before building steps:

```http
GET /api/v1/executions/{wallet}/intermediary
```

```json
{ "result": { "evm": "0x3eb032bca9a6ceeb8ce69fdf4ec79187fdddd25e" } }
```

Two things to keep in mind:

1. **It must already hold the destination token to pay gas on step 1.** The `/steps` execution collects its network fee in the destination token, so the intermediary needs a balance there _before_ you trigger
2. **The settled funds arrive here, not at the user's wallet.** That is exactly why step 2 exists: to forward them on.

### Step 1 — trigger the async operation (`/steps`)

`POST /api/v1/executions/{wallet}/steps` runs your steps against the funds the intermediary already holds — no bridge, no quote. Submit the steps that enqueue the operation:

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
    }
  ],
  "metadata": { "title": "Request redeem", "intent": "async_redeem" },
  "dry": false
}
```

Notes:

* `destinationAsset` is the token the operation eventually pays out (here, USDC on Base). It is **required**.
* Neither step above calls the USDC contract — they only touch the vault. The `/steps` endpoint rejects step sets that never call the destination token, so you'll need to append a zero-value transfer to satisfy that guard
* This endpoint does **not** require `x-api-key`.

The execution returns a payload to sign and submit (see Signing & status). Once submitted, the request is enqueued on-chain and you wait for settlement.

### Step 2 — move settled funds to another network

When the operation settles and the payout token is at the intermediary, bridge it out with the quote-backed endpoint:

```http
POST /api/v1/executions/{wallet}
x-api-key: <your-api-key>
Content-Type: application/json
```

```json
{
  "version": "1.0",
  "type": "evm",
  "quote": {
    "originAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
    "destinationAsset": "<target-network-asset>",
    "amount": "1000000",
    "swapType": "EXACT_INPUT"
  },
  "outOperation": true,
  "metadata": { "title": "Withdraw to target network", "intent": "async_withdraw" },
  "dry": false
}
```

* `originAsset` is the settled token now held by the intermediary; `destinationAsset` is where the user wants it.
* `outOperation: true` executes on the origin chain and bridges the output to the destination via 1Click.
* This endpoint **requires** `x-api-key` — it fetches a 1Click quote and prices per-key fees server-side.
