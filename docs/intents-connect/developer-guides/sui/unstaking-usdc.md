---
icon: book-open
---

# Unstaking USDC

A worked, self-contained guide to getting a **Suilend Main Market** supply of USDC back out. It covers both execution modes — **steps-only**, which leaves the proceeds with your Sui intermediary, and **out-operation**, which redeems on Sui and bridges the proceeds to another chain in the same signed request.

Suilend is the only venue USDC has here — validator staking, and so validator unstaking, is SUI-only. A Suilend supply of native SUI comes back out through the same call with four values changed; see **Redeeming a SUI position instead** at the end.

**There is no bridge-in mode here.** The redeem requires naming a cToken coin object your intermediary owns, and a bridge-in may not reference an owned object at all — its bytes are signed before the deposit lands and carry no object version that can be refreshed afterwards, so an owned object's version would go stale before they are broadcast. Attempting it is a `400` (`a pre-signed sui execution may not reference an owned object`).

### The venue

|                      | **Suilend Main Market redeem**                           |
| -------------------- | -------------------------------------------------------- |
| Coin                 | USDC                                                     |
| What you spend       | a `Coin<CToken<MAIN_POOL, USDC>>` your intermediary owns |
| What you get         | `Coin<USDC>` — the underlying plus accrued interest      |
| Move call            | `redeem_ctokens_and_withdraw_liquidity`                  |
| Extra command needed | yes — an `option::none` for the exemption parameter      |
| Timing               | immediate                                                |

### What you need before you can build the steps

#### 1. The position's object id

The position is not derivable from an address the way a Solana token account is. It is made of objects created by whichever transaction happened to mint them, so you look them up on chain against your resolved intermediary:

```
GET /api/v1/executions/{wallet}/intermediary      →  result.sui
```

A Suilend USDC position is one or more owned objects of type `0x2::coin::Coin<CToken<MAIN_POOL, USDC>>` — in full:

```
0x2::coin::Coin<0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::reserve::CToken<0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL, 0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC>>
```

Suilend mints a **fresh cToken coin per deposit**, so a position built up over several supplies is spread across several coin objects rather than growing one. Each carries a `balance`.

Send only the **object id**. Never a version and never a digest — the service reads both at build time, because a version pinned when you built the request would already be stale by the time the transaction is signed and broadcast.

#### 2. Some USDC, already liquid

Every Sui execution acts on an **action coin**, and the intermediary has to actually hold that coin — as coin objects, as a credited balance, or both — or the create is refused. On **steps-only**, at step validation:

```
the intermediary holds no <coinType>: neither a coin object nor an accumulator balance
```

On an **out-operation** the same condition surfaces later, when the action coin is resolved, and with different wording:

```
intermediary holds no sui action coin: no <coinType> coin object and no accumulator balance
```

A third rejection comes from the same precondition, worded identically on both modes:

```
intermediary holds too many sui action coin objects: <intermediary> holds more than <N> <coinType> objects and no accumulator balance
```

It fires only when the intermediary's coin-object listing hits the service's merge bound **and** its credited balance is exactly zero, because the action coin is assembled by merging the coin objects the intermediary owns into one. `N` is a deployment setting — 64 by default and never above 511, since a merge costs one argument per source plus the destination against the protocol's 512-argument ceiling — so do not hard-code it: read it out of the message. A non-zero credited balance takes the other branch and lifts the refusal, but not the bound: only the first `N` coin objects are folded into the action coin, and any beyond that stay with the intermediary unmerged.

All three are `400`s from the same precondition. Do not match on just one of the three strings.

The action coin here is the **underlying** USDC, not the cToken, and it is resolved from the intermediary's **holdings** rather than from your steps text. So a position cannot be redeemed by an intermediary that holds zero USDC, which is the reason a steps-only supply should always leave a remainder behind rather than depositing the whole balance.

The related rule — that your steps must contain at least one argument naming `{ACTION_COIN}` — is enforced on a steps-only create but **not** on an out-operation, where what gets validated instead is the whitelisted producer. Name it anyway: the producer shapes below split off it, and it still needs consuming. Whether that is mandatory or merely tidy depends on how it resolved — an unconsumed _result_ aborts the transaction, an unconsumed _input_ coin is written back to its owner — and you do not get to choose which, since it is decided at build time from the intermediary's holdings. Write steps that are correct either way.

On the **steps-only** shape the requirement is stronger than "non-zero": the commission is carved before step 0 while the proceeds only reach the intermediary at the end, so the fee has to be liquid up front. The **out-operation** shapes merge the proceeds into the action coin, which moves the carve behind that merge and lifts the requirement. Read where the commission is drawn below before sizing an amount — it is the single easiest thing to get wrong here.

#### 3. How much the position is actually worth

**cToken amounts are not denominated in the underlying.** A cToken shares the reserve's decimals but is worth _more_ than one unit of the underlying, and the ratio grows as interest accrues. Label these as cTokens wherever you display them, and convert through the reserve's current exchange rate if you need an underlying figure.

That means the amount you show the user before the fact is an estimate. The proceeds are whatever the Move call returns.

### The two execution modes

|                          | **steps-only**                           | **out-operation**                                                   |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------------------- |
| Endpoint                 | `POST /api/v1/executions/{wallet}/steps` | `POST /api/v1/executions/{wallet}`                                  |
| Carries a `quote`        | no                                       | yes                                                                 |
| `outOperation: true`     | no                                       | **yes**                                                             |
| `x-api-key` header       | not required                             | **required**                                                        |
| Where the proceeds land  | with the intermediary, on Sui            | bridged to another chain                                            |
| Sui asset is             | `destinationAsset`                       | `quote.originAsset`                                                 |
| Needs a producer command | no                                       | **yes**                                                             |
| Placeholders available   | `{ACTION_COIN}`, `{INTERMEDIARY}`        | those plus `{DEPOSIT_ADDRESS}`, and `{AMOUNT_IN}` on `EXACT_OUTPUT` |
| Lifecycle                | create → sign → broadcast                | create → sign → broadcast → bridge settlement                       |

Neither mode involves a user deposit — the funds are already on Sui — so both broadcast as soon as your signature is submitted.

### Addresses (Sui mainnet)

| Thing                                                     | Value                                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Suilend call package (v23, latest at the time of writing) | `0x4989dd9a04581ee50d0d0b3dd99b56c1a86bc363b57dc5b64264832c97e72645`             |
| Suilend type package (original publish)                   | `0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf`             |
| `LendingMarket<MAIN_POOL>` — shared, by `&mut`            | `0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1`             |
| `Clock` — shared, read-only                               | `0x0000000000000000000000000000000000000000000000000000000000000006`             |
| `reserve_array_index` for USDC                            | `7`                                                                              |
| `reserve_array_index` for SUI                             | `0`                                                                              |
| USDC coin type                                            | `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC` |
| SUI coin type                                             | `0x2::sui::SUI` — a type argument only, never a `target` or `objectId`           |
| `0x1` Move stdlib, in full                                | `0x0000000000000000000000000000000000000000000000000000000000000001`             |
| `0x2` Sui framework, in full                              | `0x0000000000000000000000000000000000000000000000000000000000000002`             |

Call the **latest** Suilend package and tag types with the **original** one: the market asserts on its own `version` field, while a Move type keeps the address of the package that defined it. A Suilend upgrade publishes a **new package at a new address** every time — v21 (`0xe53906c2…`) and v22 (`0x7c82c37d…`) are the two immediate predecessors of the address above — so re-resolve the head of the version lineage from chain rather than copying it out of this table, and re-read `reserve_array_index` off the live market object: it is a position in the `reserves` vector, not an id.

***

## Mode 1 — steps-only (redeem into the intermediary)

### Redeeming a Suilend position

The Move signature is:

```
redeem_ctokens_and_withdraw_liquidity<P, T>(
  market: &mut LendingMarket<P>,
  reserve_array_index: u64,
  clock: &Clock,
  ctokens: Coin<CToken<P, T>>,
  rate_limiter_exemption: Option<RateLimiterExemption<P, T>>,
  ctx: &mut TxContext,
): Coin<T>
```

That `Option` parameter is the one shape surprise in this flow. **It cannot be a pure argument.** Sui accepts a pure `Option<T>` only when `T` has a primitive BCS layout, and `RateLimiterExemption` is a struct — so neither `{"kind": "pure", "type": "option<…>", "value": null}` nor a hand-encoded `"raw"` byte works. What does work is a `moveCall` that _returns_ the `None`, wired in as a result. Three commands:

```jsonc
"steps": [
  {
    "metadata": { "name": "option::none",
                  "description": "No rate-limiter exemption (Option<RateLimiterExemption> = none)" },
    "command": "moveCall",
    "target":  "0x0000000000000000000000000000000000000000000000000000000000000001::option::none",
    "typeArguments": [
      "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::RateLimiterExemption<0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL, 0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC>"
    ]
    // no "arguments" — option::none takes none
  },
  {
    "metadata": { "name": "redeem_ctokens_and_withdraw_liquidity",
                  "description": "Burn cTokens and withdraw USDC" },
    "command": "moveCall",
    "target":  "0x4989dd9a04581ee50d0d0b3dd99b56c1a86bc363b57dc5b64264832c97e72645::lending_market::redeem_ctokens_and_withdraw_liquidity",
    "typeArguments": [
      "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL",
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
    ],
    "arguments": [
      { "kind": "object", "objectId": "0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1",
        "shared": true, "mutable": true },                        // the lending market, by &mut
      { "kind": "pure",   "type": "u64", "value": "7" },          // reserve_array_index for USDC
      { "kind": "object", "objectId": "0x0000000000000000000000000000000000000000000000000000000000000006",
        "shared": true },                                         // the Clock, by &
      { "kind": "object", "objectId": "<your cToken coin object id>" },  // owned, taken by value
      { "kind": "result", "command": 0 }                          // the None from step 0
      // no argument for the trailing &mut TxContext
    ]
  },
  {
    "metadata": { "name": "Sink", "description": "Keep the withdrawn coin and consume the action coin" },
    "command":   "transferObjects",
    "arguments": [
      { "kind": "result", "command": 1 },                         // the withdrawn Coin<USDC>
      { "kind": "object", "objectId": "{ACTION_COIN}" }           // named and consumed
    ],
    "recipient": { "kind": "pure", "type": "address", "value": "{INTERMEDIARY}" }
  }
]
```

The third step does double duty: the redeem **returns** a `Coin<T>`, and Sui aborts on an unconsumed coin result. The action coin rides along in the same command, which costs nothing and covers the case where it too resolved to a result rather than to an owned coin object.

**The whole cToken coin is spent.** The redeem takes it by value, so this shape redeems that coin object in full. Two consequences:

* **To redeem more than one cToken coin**, add one `option::none` + `redeem` pair per coin object and let all their returned coins ride the same trailing transfer. Folding them into one coin first is also legal: a `mergeCoins` only borrows its destination, so the redeem can still take that coin by value afterwards, and the two references share one transaction input.
* **To redeem part of a position**, the cheapest lever is to name a _smaller_ cToken coin object: since each deposit mints its own, a position is usually already split into several. For an arbitrary amount, put a `splitCoins` on the cToken coin ahead of the redeem and pass its `nestedResult` output in. Do not add a transfer for the remainder — a split only borrows its coin, so what is left stays with its owner automatically. The amount you split is in **cTokens**, not in the underlying, so convert through the reserve's exchange rate first.

### The create request

```jsonc
POST /api/v1/executions/0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5/steps
{
  "version": "1.0",
  "type": "sui",
  "destinationAsset": "<asset id for USDC on Sui>",
  "steps": [ /* as above */ ],
  "metadata": { "title": "Redeem from Suilend Main Market", "intent": "suilend_redeem" },
  "dry": false
}
```

`destinationAsset` is the **underlying** coin's asset id — it is what the action coin resolves to — never the cToken and never a Move coin type. Always send `type: "sui"` explicitly: it may be omitted, but an omitted `type` is recorded as the literal `"evm"` and every response for that execution then reports `"type": "evm"` back to you. No API key is needed on this endpoint. A TON origin wallet also sends `publicKey`.

`"dry": true` gives you a priced preview that signs and persists nothing, returns `result.details.networkFee`, echoes your steps back verbatim and omits the signing payload. A dry run does read the chain — it resolves the live version of every object you named — so a cToken coin a previous redeem already burned is caught at preview time rather than surviving to the real create. It is not free and not instant for that reason.

What the service does **not** check is that an object is of the type your step uses it as. A cToken coin id is just an object id on the wire, and a mismatched one fails inside the Move call rather than at validation. Re-reading the position and checking its type immediately before the create is worth doing yourself, particularly on an out-operation where a failed create has also spent a quote deadline.

***

## Mode 2 — out-operation (redeem, then bridge the proceeds out)

An out-operation runs your steps on Sui and bridges the output to another chain. Sui is the **origin** here, so the Sui asset goes in `quote.originAsset` and the far side in `quote.destinationAsset`. Sui is a destination only, so a `sui` → `sui` pair is a `400`.

One of your commands must be the **producer**: the one that pays the 1CLICK deposit address. The service **rewrites its amount** so the commission comes out of the same total, so the producer must be one of exactly two whitelisted shapes or the create fails with `outOperation requires a whitelisted transfer to the {DEPOSIT_ADDRESS} (1click deposit) in the Sui steps`. Both flows below use the first shape: a `splitCoins` whose `amounts[0]` a later `transferObjects` pays out.

The second whitelisted shape is a `moveCall` of `0x2::pay::split_and_transfer<T>` with the amount at `arguments[1]` and the recipient at `arguments[2]` — remember the target package needs the full 64-hex spelling of `0x2`. Anything else is not recognised, and the create fails rather than silently no-opping: a no-op would bridge out an amount the commission was never taken from.

Both argument **types** in the producer are load-bearing rather than stylistic. The amount must be a pure `u64`, because the service cannot rewrite opaque bytes, and the `{DEPOSIT_ADDRESS}` recipient must be a pure `address`, because that is what the whitelist matches on. Getting either wrong lands in the same `400` quoted above; only its suffix differs — `out-operation amount is of type "raw", expected u64` in the first case, `producer transfer to 0x… not found in steps` in the second. On the `splitCoins` shape the amount must be `amounts[0]`, and the transfer must take that split's **first** output with a `nestedResult` of `index: 0` — a whole-tuple `result` matches only when the split has exactly one amount.

### Redeem a position and bridge the proceeds out

Six commands. The redeemed coin is **merged into the action coin** rather than paid out directly, for two reasons: the merge consumes the redeem's return value, and it leaves the producer in the exact canonical shape the whitelist matches — a `splitCoins` off `{ACTION_COIN}`.

```jsonc
"steps": [
  {
    "metadata": { "name": "option::none", "description": "No rate-limiter exemption" },
    "command": "moveCall",
    "target":  "0x0000000000000000000000000000000000000000000000000000000000000001::option::none",
    "typeArguments": [
      "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::RateLimiterExemption<0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL, 0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC>"
    ]
  },
  {
    "metadata": { "name": "redeem_ctokens_and_withdraw_liquidity",
                  "description": "Burn cTokens and withdraw USDC" },
    "command": "moveCall",
    "target":  "0x4989dd9a04581ee50d0d0b3dd99b56c1a86bc363b57dc5b64264832c97e72645::lending_market::redeem_ctokens_and_withdraw_liquidity",
    "typeArguments": [
      "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL",
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
    ],
    "arguments": [
      { "kind": "object", "objectId": "0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1",
        "shared": true, "mutable": true },
      { "kind": "pure",   "type": "u64", "value": "7" },
      { "kind": "object", "objectId": "0x0000000000000000000000000000000000000000000000000000000000000006",
        "shared": true },
      { "kind": "object", "objectId": "<your cToken coin object id>" },
      { "kind": "result", "command": 0 }
    ]
  },
  {
    "metadata": { "name": "Merge", "description": "Fold the withdrawn coin into the action coin" },
    "command": "mergeCoins",
    "coin":    { "kind": "object", "objectId": "{ACTION_COIN}" },   // destination — NOT consumed
    "sources": [ { "kind": "result", "command": 1 } ]               // consumed
  },
  {
    "metadata": { "name": "Split for the bridge",
                  "description": "Carve the bridged amount out of the action coin (the service rewrites it)" },
    "command": "splitCoins",
    "coin":    { "kind": "object", "objectId": "{ACTION_COIN}" },
    "amounts": [ { "kind": "pure", "type": "u64", "value": "2000000" } ]   // see below
  },
  {
    "metadata": { "name": "Pay the 1click deposit", "description": "The whitelisted producer transfer" },
    "command":   "transferObjects",
    "arguments": [ { "kind": "nestedResult", "command": 3, "index": 0 } ],
    "recipient": { "kind": "pure", "type": "address", "value": "{DEPOSIT_ADDRESS}" }
  },
  {
    "metadata": { "name": "Sink", "description": "Consume the action coin" },
    "command":   "transferObjects",
    "arguments": [ { "kind": "object", "objectId": "{ACTION_COIN}" } ],
    "recipient": { "kind": "pure", "type": "address", "value": "{INTERMEDIARY}" }
  }
]
```

A `mergeCoins` that names the action coin as its **destination** does not consume it, so the trailing sink is still required. (A `mergeCoins` that names it as a _source_ would consume it — that is the other way to satisfy the rule.)

**This shape redeems the whole cToken coin.** The redeem takes its `Coin<CToken<P, T>>` **by value**, so the coin object is burnt in full whatever the producer amount is, and everything the redeem returns beyond what you bridge stays with the intermediary as liquid balance. If the position is larger than what you are bridging, use the partial shape below.

#### Redeem only the bridged amount

Seven commands: the same array with a `splitCoins` on the **cToken coin** inserted ahead of the redeem, so the rest of the position stays deposited.

```jsonc
"steps": [
  {
    "metadata": { "name": "option::none", "description": "No rate-limiter exemption" },
    "command": "moveCall",
    "target":  "0x0000000000000000000000000000000000000000000000000000000000000001::option::none",
    "typeArguments": [ "<RateLimiterExemption<MAIN_POOL, USDC>>" ]
  },
  {
    "metadata": { "name": "Split the cTokens", "description": "Carve the redeemed slice out of the position" },
    "command": "splitCoins",
    "coin":    { "kind": "object", "objectId": "<your cToken coin object id>" },
    "amounts": [ { "kind": "pure", "type": "u64", "value": "<the redeemed amount, in cTOKENS>" } ]
  },
  {
    "metadata": { "name": "redeem", "description": "Burn the slice, withdraw the underlying" },
    "command": "moveCall",
    "target":  "0x4989dd9a04581ee50d0d0b3dd99b56c1a86bc363b57dc5b64264832c97e72645::lending_market::redeem_ctokens_and_withdraw_liquidity",
    "typeArguments": [ "<MAIN_POOL>", "<USDC>" ],
    "arguments": [
      { "kind": "object", "objectId": "0x84030d26…", "shared": true, "mutable": true },
      { "kind": "pure",   "type": "u64", "value": "7" },
      { "kind": "object", "objectId": "0x0000…0006", "shared": true },
      { "kind": "nestedResult", "command": 1, "index": 0 },   // the slice, not the whole coin
      { "kind": "result", "command": 0 }
    ]
  },
  {
    "metadata": { "name": "Merge", "description": "Fold the withdrawn coin into the action coin" },
    "command": "mergeCoins",
    "coin":    { "kind": "object", "objectId": "{ACTION_COIN}" },
    "sources": [ { "kind": "result", "command": 2 } ]
  },
  {
    "metadata": { "name": "Producer split", "description": "Carve the bridged amount" },
    "command": "splitCoins",
    "coin":    { "kind": "object", "objectId": "{ACTION_COIN}" },
    "amounts": [ { "kind": "pure", "type": "u64", "value": "<producer amount, in the UNDERLYING>" } ]
  },
  {
    "metadata": { "name": "Producer pay", "description": "Pay the 1CLICK deposit address" },
    "command":   "transferObjects",
    "arguments": [ { "kind": "nestedResult", "command": 4, "index": 0 } ],
    "recipient": { "kind": "pure", "type": "address", "value": "{DEPOSIT_ADDRESS}" }
  },
  {
    "metadata": { "name": "Sink", "description": "Consume the action coin" },
    "command":   "transferObjects",
    "arguments": [ { "kind": "object", "objectId": "{ACTION_COIN}" } ],
    "recipient": { "kind": "pure", "type": "address", "value": "{INTERMEDIARY}" }
  }
]
```

**The two amounts are different, and only one of them is rewritten.** The producer split at step 4 is the one the service rewrites to `quote.amount - networkFee`. The cToken split at step 1 is yours and is left alone, so it has to stay at the **full** amount — the withdrawal has to cover the producer _and_ the commission, which is drawn one command after the merge at step 3.

Two more things about the cToken split. Its amount is denominated in **cTokens** while the producer's is in the **underlying**, and the mismatch is safe in one direction only: a cToken is worth at least one underlying and the exchange rate only grows, so splitting N cTokens redeems at least N underlying and the producer is always covered. The cost is exactness — the position gives up N cTokens, slightly more underlying comes back, and the premium lands in the liquid balance. And `splitCoins` aborts unless the coin's **face** amount is at least the figure you ask for, so a partial redeem cannot ask for more underlying than the cToken coin actually holds.

Two `splitCoins` in one array does not confuse the producer whitelist: the service matches a `splitCoins` only when a later `transferObjects` pays `{DEPOSIT_ADDRESS}` with its output, which the cToken split never does.

### The create request

```jsonc
POST /api/v1/executions/0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5
x-api-key: <your key>
{
  "version": "1.0",
  "type": "sui",
  "outOperation": true,
  "quote": {
    "originAsset":       "<asset id for USDC on Sui>",
    "amount":            "2000000",
    "destinationAsset":  "<asset id on the far chain>",
    "slippageTolerance": 100,                          // basis points
    "swapType":          "EXACT_INPUT",
    "deadline":          "2026-08-19T12:34:56.000Z",
    "recipient":         "<optional far-chain recipient>"
  },
  "steps": [ /* as above */ ],
  "metadata": { "title": "Withdraw from Sui", "intent": "sui_withdraw" },
  "dry": false
}
```

`type: "sui"` must agree with the **origin** chain on an out-operation. List the Sui asset ids from `GET /api/v1/supported_tokens?flow=outOperation` — Sui appears in `result.in` on that flow, since it is the side being bridged _from_; with `?flow=inOperation` it appears in `result.out` instead. `quote.recipient` is optional and out-operation only (it is a `400` on a bridge-in); left off, the service defaults it to the origin wallet in the path.

A **missing** `x-api-key` is a flat `401` from the middleware, before any validation. An **invalid** one passes the middleware and is only rejected when the quote is fetched, after your steps have been validated — so a bad key on a bad payload surfaces as the payload's `400` first.

Quote defaults, if you leave them out: `swapType` is `EXACT_INPUT`, `slippageTolerance` is `100` basis points when zero or absent, `deadline` is ten minutes out, and `version` is `"1.0"`.

Price it with `"dry": true` first. You need `details.networkFee` to know what the commission will take out of the unwound proceeds — on the shapes in this guide it is drawn after the merge, not from the liquid balance — and a dry request is exempt from the one-live-execution rule, so a preview never collides with a running execution.

#### What to put in the producer amount

The service overwrites the producer amount outright, and the rewrite is what lands on chain. Nothing you put in that slot survives — only its **kind** and **type** are checked, so any legal pure `u64` produces byte-identical signed output. Send the conventional value anyway, so the payload reads as what it means:

* **`EXACT_INPUT`** — send the same figure as `quote.amount`, a pure `u64` in the Sui coin's atomic units. The service rewrites it to `quote.amount - networkFee`, so the producer and the commission together total the amount the user fixed, and it re-quotes at the net figure so the quote matches what the producer actually deposits. A `networkFee` at or above `quote.amount` is a `400`.
* **`EXACT_OUTPUT`** — send the `{AMOUNT_IN}` placeholder. It substitutes the origin commitment (`quote.amountIn` plus the network fee), and the carve then overwrites the same field with `quote.amountIn`, so the producer pays `amountIn` and the user's total debit is producer plus commission.

Either way, do not present the value you sent, or the value a dry run echoes, as the amount that gets transferred. `{MIN_AMOUNT_OUT}` is a `400` on an out-operation — the steps run before the bridge, so there is no destination `minAmountOut` to splice in — and `{AMOUNT_IN}` is a `400` on anything other than `EXACT_OUTPUT`. 1CLICK refunds unused slippage to the intermediary.

How the response's quote figures relate to the commission differs by swap type, which matters before you display them. On `EXACT_INPUT` the service re-quotes at `quote.amount - networkFee` and returns _that_ quote, so its figures are already net. On `EXACT_OUTPUT` the preliminary quote is kept and the user's commitment is `amountIn + networkFee`, so the response figures are the raw numbers with the commission sitting outside them. Either way the echoed producer amount is the carved one, since that field is the one the service rewrote — but on the `201` every pure argument, that one included, comes back as `{"kind": "pure", "type": "raw", "value": "<hex>"}`, so read the `u64` out of eight little-endian bytes rather than expecting a decimal string.

That split describes the `201` only. A `dry` preview returns before the re-quote, so it always carries the preliminary quote taken at the full `quote.amount`: on `EXACT_INPUT` its `amountOut` / `minAmountOut` are gross, and higher than the real create will report, even when `networkFee` is present. Price the fee with a preview, then read the quote figures off the `201`.

#### Where the commission is drawn

The service takes its commission as a `splitCoins` off the action coin plus a `transferObjects` paying the service-fee address, and **where in the array that pair lands depends on your steps**:

* If any step is a `mergeCoins` whose **destination** is the action coin — and whose `sources` do not also name it, since a self-merge is an abort rather than a funding — the pair is emitted **one command after the last such merge**. That is the shape of every out-operation array above, so the commission is drawn out of a coin the redeem has already funded.
* If no step does, the pair is prepended **ahead of step 0** and can only draw on what the intermediary already held. That is the shape of the steps-only array above.

A `mergeCoins` destination is the only funding effect the service can read off the wire — Sui types it as a `&mut` borrow, so the coin provably survives the command that certifies the funding. Funding the action coin through a `moveCall` that takes it by `&mut Coin<T>` is invisible to that scan and is left fail-closed: the pair stays ahead of step 0 and the split aborts if the balance does not already cover the fee. Use a `mergeCoins` step whenever you want the proceeds to fund the commission.

#### The liquid-fee precondition (steps-only only)

**On the steps-only shape in this guide the intermediary must already hold at least the network fee in USDC, liquid, before the execution starts.** That array never merges anything into the action coin — it transfers the proceeds to the intermediary instead — so the commission is carved before step 0, against whatever the intermediary held on its own:

* A **zero** balance is caught cleanly at create, with the message belonging to that flow — the steps-only wording quoted earlier, or `intermediary holds no sui action coin: no <coinType> coin object and no accumulator balance` on an out-operation.
* A balance **between zero and the fee** is not caught by a field check. The carve itself aborts, and the service names it for you rather than leaving you an index to decode: `400 sui transaction simulation reverted: the <amount> commission split aborted at command N: … (the action coin does not hold the commission at that point in the transaction)`.

The out-operation shapes do **not** carry this precondition, because their `mergeCoins` moves the carve behind the redeem. An intermediary holding only dust of USDC can still unwind a large position and bridge the proceeds out.

What none of this constrains is the bridged amount. Because the proceeds are merged in before the producer split, the amount you can bridge out is the intermediary's liquid balance **plus** the redeemed value. Checking the requested amount against the liquid balance by itself will reject exactly the case these flows exist for.

#### Lifecycle

There is no user deposit — the funds are already on Sui — so it is create → sign → poll:

1. **Create.** The `201` carries the quote, `details.networkFee` and the signing payload under `result.details`.
2. **Sign** `details.payload` with your origin wallet using the `signingStandard` the response names, and `POST /api/v1/executions/{wallet}/submit`. The reply is `{"status": "SIGNING"}` and the transaction broadcasts right away.
3. **Poll** `GET /api/v1/executions/{wallet}?id=<executionId>` through `OPERATION_PENDING` → `OPERATION_PROCESSING` → `SUCCESS`. An out-operation starts at `OPERATION_PENDING`, and its only failure state is `OPERATION_FAILED` — `EXPIRED` is reachable only from `CREATED` or `DEPOSIT_PENDING`, which an out-operation never occupies.

**`SUCCESS` here means the far side settled, not that the Sui transaction landed.** Unlike a steps-only or bridge-in execution, an out-operation does not advance on its own receipt: once the Sui transaction confirms, the service notifies 1CLICK and holds the row at `OPERATION_PROCESSING` until the bridge settlement is confirmed. So on an out-operation, `OPERATION_PROCESSING` means "the Sui side is done, the bridge is in flight". 1CLICK refunds any unused slippage to the intermediary.

Two consequences of that hold. The row occupies the one-live-Sui-execution slot for the whole bridging window, so the next Sui execution for that wallet is `409` until it finishes. And `OPERATION_PROCESSING` is **not** a deletable status, so an out-operation in that state can neither be cleared nor superseded by hand.

An out-operation is not expired by the quote deadline the way a bridge-in is — there is no deposit to wait for — but the signed transaction is still only valid for the current Sui epoch and the next, roughly one to two days. An execution that never broadcast inside that window is force-failed to `OPERATION_FAILED`.

***

### Rules that apply here

* **Reference results backwards only.** The chains above are long — a `nestedResult` or `result` must point at a strictly earlier index in your own array, and `splitCoins` output is always read with `nestedResult` because that command returns a tuple.
* **One transaction input per object id.** Naming the same object in several commands is fine — the service allocates one input for it and every occurrence points at that input, which is what the protocol requires: a transaction that listed the same object id twice would be rejected. A later `"mutable": true` use of a shared object promotes the input a read-only use already allocated. The one thing you may not do is declare one id both `shared: true` and owned: that fails the build with `object 0x… is used both as a shared and as an owned object`.
* **Consume everything a command returns.** The redeem's `Coin<T>`, the `option::none`'s value, a `splitCoins` **output** — Sui aborts on an unconsumed result that has no `drop`. The coin a `splitCoins` borrowed is not a result and needs nothing; an unread output is what kills the transaction. This is the one rule with no create-time field check behind it: it is caught, if at all, by simulation — normally the fee probe, which fails closed, and otherwise the second, pre-sign simulation, which fails open on a transport error. Write the array correctly rather than relying on either to catch it.
* **One live Sui execution per wallet at a time.** Any non-terminal Sui execution blocks the next one, whichever side Sui is on, so two Sui out-operations to _different_ chains collide where the EVM rule would allow both. A second create is `409`. The slot frees when the blocking row reaches `SUCCESS`, `DEPOSIT_FAILED`, `OPERATION_FAILED` or `EXPIRED` — which, for an out-operation, means after the bridge settles. A `dry` request is exempt. Practically: a supply and its redeem cannot be back to back; the first has to finish.
* **Do not add gas, a fee transfer, or a budget**, and never name the service's sponsor or fee address. `0x2::coin::redeem_funds` and everything in `0x2::funds_accumulator` are reserved.
* **At most 50 steps**, and a request body of at most 256 KB — both deployment defaults rather than protocol constants.

#### The Suilend rate limiter

A redeem is metered by Suilend's **market-wide outflow rate limiter**, valued at the reserve's upper-bound price. The only in-transaction bypass is a genuine `RateLimiterExemption` — which is exactly the `Option` these steps pass as `none` — so a redeem large enough to exhaust the market's current window **aborts**, and the fix is a smaller amount rather than a different step shape. The window is shared with every other user of the market, so the same amount can succeed and then fail minutes later.

The failure is usually safe rather than lossy: a steps-only or out-operation create simulates your steps twice before anything is signed — the fee probe first, at a stand-in commission, then the assembled transaction with the real one — so this normally surfaces as `400 sui transaction simulation reverted: fee probe aborted at command N: …` at create, and a probe that cannot run is a `502` rather than a pass. Only the second simulation fails open on a transport error, so treat that one as a good backstop rather than a guarantee. Note that the redeem does **not** assert price freshness — the `refresh_reserve_price` and Pyth push chain belongs to the obligation borrow path, so no price update needs prepending here.

When you get an abort, **read the command index as absolute**, and reconstruct the offset in two parts. The message is `fee probe aborted at command N` when the probe caught it and `command N aborted` when the second simulation did; N means the same thing in both.

First, the service prepends **zero to two** commands ahead of your step 0, for materialising the action coin: nothing at all when it came from a single owned coin object, a `mergeCoins` when several had to be folded together, a `0x2::coin::redeem_funds` call when it came from a credited accumulator balance, and both when the intermediary held some of each. (The withdrawal itself is a transaction _input_, not a command, so a credited balance costs one command, not two.)

Second, the commission `splitCoins` and its `transferObjects` add two more commands, but only steps at or after the pair are displaced by them — and where the pair sits depends on your array, as described under where the commission is drawn. On the out-operation shapes above the pair follows the merge, so your steps before it carry only the first offset and the steps after it carry both.

You cannot infer either part from the payload alone: neither the prepended block nor the commission pair appears in the echoed `steps`, so an abort message is the one place they are visible. An abort that lands on the commission split itself says so in words rather than leaving you to decode an index.

#### Checking a Move parameter is really by value

Every "must be consumed" judgement above rests on whether a Move parameter takes its value by value or by reference, and no request payload can tell you which. Read it off the chain instead: a function's signature reports each parameter's `reference` as `mutable`, `immutable`, or **null for by value**. That is how you confirm the redeem consumes its cToken coin and returns a `Coin<T>` you have to place somewhere.

### Redeeming a SUI position instead

A Suilend supply of native SUI comes back out through the same call with the same `option::none` command ahead of it, and every rule, threshold and abort above applies unchanged. Four values differ.

|                               | USDC                            | SUI                                      |
| ----------------------------- | ------------------------------- | ---------------------------------------- |
| `reserve_array_index`         | `7`                             | **`0`**                                  |
| Second type argument (`T`)    | `0xdba34672…::usdc::USDC`       | **`0x2::sui::SUI`**                      |
| cToken object type to look up | `Coin<CToken<MAIN_POOL, USDC>>` | `Coin<CToken<MAIN_POOL, 0x2::sui::SUI>>` |
| What the redeem returns       | `Coin<USDC>`, 6 decimals        | `Coin<SUI>`, **9 decimals — MIST**       |

`T` has to match in **both** commands: the second `typeArguments` entry of the redeem, and the `RateLimiterExemption<P, T>` type argument the `option::none` is instantiated with. Changing one and not the other produces a call that resolves and then fails type checking.

The 9 decimals reach further than the amounts themselves. A partial redeem's `splitCoins` amount is in **cTokens**, as it is for USDC — but the exchange rate you convert through is now against MIST, so a figure carried over from a USDC calculation is a thousand-fold off. The same goes for the out-operation producer amount and for anything you display.

`reserve_array_index` stays a position in the `reserves` vector rather than an id, so re-read it off the live market object; an index whose `coin_type` disagrees with `T` aborts with `EWrongType`. And `0x2::sui::SUI` is accepted anywhere a type argument is accepted, in either its shorthand or its padded 64-hex spelling, but never in a `target` or an `objectId`.

Note that the SUI you get back is an ordinary `Coin<SUI>`, not gas: you never pay SUI for gas here either, so the whole redeemed coin is available to the rest of your steps.

### Sign and submit

Identical to every other destination. The create response returns `result.details.payload` and `result.details.signingStandard` — the standard is your **origin wallet's** (`erc191` for EVM, `raw_ed25519` for Solana, `nep413` for NEAR, `tip191` for Tron, `sep53` for Stellar, `ton_connect` for TON). Sign that payload and post it:

```
POST /api/v1/executions/{wallet}/submit
{ "signature": "…", "executionId": "…" }
```

An ed25519 origin (Solana, NEAR, Stellar) adds `publicKey`; a TON origin adds both `publicKey` and a `tonConnect` envelope. You never handle the Sui transaction bytes and you never pay SUI for gas — the service sponsors the transaction and recovers the cost through the commission it carves out of the action coin.

Both modes here broadcast as soon as your signature lands, so they finish far inside the epoch window a signed Sui transaction is valid for.
