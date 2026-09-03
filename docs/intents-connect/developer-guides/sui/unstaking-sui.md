---
icon: book-open
---

# Unstaking Sui

A worked, self-contained guide to withdrawing a native **SUI** validator stake. It covers both execution modes — **steps-only**, which leaves the proceeds with your Sui intermediary, and **out-operation**, which unstakes on Sui and bridges the proceeds to another chain in the same signed request.

**There is no bridge-in mode here.** Unstaking requires naming the `StakedSui` object your intermediary owns, and a bridge-in may not reference an owned object at all — its bytes are signed before the deposit lands and carry no object version that can be refreshed afterwards, so an owned object's version would go stale before they are broadcast. Attempting it is a `400` (`a pre-signed sui execution may not reference an owned object`).

### The venue

|                      | **Validator unstake**                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| What you spend       | a `StakedSui` your intermediary owns                                                           |
| What you get         | principal plus accrued staking rewards                                                         |
| Move call            | `request_withdraw_stake` on steps-only, `request_withdraw_stake_non_entry` on an out-operation |
| Extra command needed | on an out-operation, a `coin::from_balance`                                                    |
| Timing               | immediate, but rewards only accrue per epoch                                                   |

**Withdrawing has two entry points, and which one you want depends on the mode.** `request_withdraw_stake` is `entry`: it transfers the proceeds to the sender as a brand-new object, which the same transaction has no way to name — fine when you just want the coin back, useless when you need to spend it in the same array. `request_withdraw_stake_non_entry` returns a `Balance<SUI>` instead, which `0x2::coin::from_balance<0x2::sui::SUI>` turns into a coin you can merge and bridge. That is why the out-operation below uses the non-entry variant.

### What you need before you can build the steps

#### 1. The stake's object id

A stake is not derivable from an address the way a Solana token account is. It is an object created by whichever transaction happened to mint it, so you look it up on chain against your resolved intermediary:

```
GET /api/v1/executions/{wallet}/intermediary      →  result.sui
```

A validator stake is an owned `0x3::staking_pool::StakedSui`, carrying `principal`, `pool_id` and `stake_activation_epoch`. Each stake mints its own object, so a position built up over several executions is spread across several `StakedSui` objects rather than growing one.

Send only the **object id**. Never a version and never a digest — the service reads both at build time, because a version pinned when you built the request would already be stale by the time the transaction is signed and broadcast.

#### 2. Some SUI, already liquid

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

The action coin here is liquid **SUI**, not the `StakedSui`, and it is resolved from the intermediary's **holdings** rather than from your steps text. So a stake cannot be withdrawn by an intermediary that holds zero liquid SUI, which is the reason a steps-only stake should always leave a remainder behind rather than staking the whole balance.

The related rule — that your steps must contain at least one argument naming `{ACTION_COIN}` — is enforced on a steps-only create but **not** on an out-operation, where what gets validated instead is the whitelisted producer. Name it anyway: the producer shapes below split off it, and it still needs consuming. Whether that is mandatory or merely tidy depends on how it resolved — an unconsumed _result_ aborts the transaction, an unconsumed _input_ coin is written back to its owner — and you do not get to choose which, since it is decided at build time from the intermediary's holdings. Write steps that are correct either way.

On the **steps-only** shape the requirement is stronger than "non-zero": the commission is carved before step 0 while the proceeds only reach the intermediary at the end, so the fee has to be liquid up front. The **out-operation** shapes merge the proceeds into the action coin, which moves the carve behind that merge and lifts the requirement. Read where the commission is drawn below before sizing an amount — it is the single easiest thing to get wrong here.

#### 3. How much the stake is actually worth

**`StakedSui.principal` excludes rewards.** Rewards live in the staking pool and only materialise on withdrawal, so summing principal _understates_ what an unstake returns. No API reports the accrued figure directly; computing it means reading the pool's exchange-rate table at the stake's activation epoch and at the current one.

So the amount you show the user before the fact is an estimate. The proceeds are whatever the Move call returns.

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

| Thing                                | Value                                                                |
| ------------------------------------ | -------------------------------------------------------------------- |
| `0x3` system package, in full        | `0x0000000000000000000000000000000000000000000000000000000000000003` |
| `SuiSystemState` — shared, by `&mut` | `0x0000000000000000000000000000000000000000000000000000000000000005` |
| `0x2` Sui framework, in full         | `0x0000000000000000000000000000000000000000000000000000000000000002` |
| SUI coin type                        | `0x2::sui::SUI`                                                      |

The shorthand `0x2::sui::SUI` is legal in a type argument, but a `target` package and every `objectId` must be written in full 64-hex form.

***

## Mode 1 — steps-only (withdraw into the intermediary)

### Withdrawing a validator stake

`request_withdraw_stake` is an entry function: it transfers the withdrawn coin — principal plus rewards — to the sender itself and returns nothing. So there is no result to consume, but the action coin still has to be named and sunk, which is what the second command is for:

```jsonc
"steps": [
  {
    "metadata": { "name": "request_withdraw_stake",
                  "description": "Withdraw a StakedSui; principal + rewards go to the intermediary" },
    "command": "moveCall",
    "target":  "0x0000000000000000000000000000000000000000000000000000000000000003::sui_system::request_withdraw_stake",
    "arguments": [
      { "kind": "object", "objectId": "0x0000000000000000000000000000000000000000000000000000000000000005",
        "shared": true, "mutable": true },                        // SuiSystemState, by &mut
      { "kind": "object", "objectId": "<your StakedSui object id>" }   // owned, taken by value
      // no argument for the trailing &mut TxContext
    ]
  },
  {
    "metadata": { "name": "Sink", "description": "Consume the action coin" },
    "command":   "transferObjects",
    "arguments": [ { "kind": "object", "objectId": "{ACTION_COIN}" } ],
    "recipient": { "kind": "pure", "type": "address", "value": "{INTERMEDIARY}" }
  }
]
```

One `StakedSui` per command. To withdraw several, repeat the first command once per object — each one is independent — and keep a single trailing sink.

**This shape withdraws the whole stake.** `request_withdraw_stake` takes its `StakedSui` **by value**, so there is no amount in the shape at all. To unwind only part of a stake, split it first with `0x3::staking_pool::split` — the command is described under Unstake only the bridged amount below and works the same way outside an out-operation, feeding its returned `StakedSui` into `request_withdraw_stake` as `{ "kind": "result", "command": 0 }` instead of the object id. That the withdraw is `entry` does not stop it taking a value an earlier command produced: it is `public entry` (verified live), and only a **private** entry function — `entry` without `public` — is barred from taking a result.

So the partial shape is three commands: the `split`, the `request_withdraw_stake` on its result, and the same trailing sink. The remainder stays with the intermediary untouched, because `split` only borrows the original `StakedSui` (`&mut`).

The proceeds arrive as a **brand-new coin object** created by this transaction, which is why this shape cannot also bridge them out: the transaction has no way to name an object it is in the middle of creating. The out-operation below uses the non-entry variant for exactly that reason.

### The create request

```jsonc
POST /api/v1/executions/0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5/steps
{
  "version": "1.0",
  "type": "sui",
  "destinationAsset": "<asset id for native SUI>",
  "steps": [ /* as above */ ],
  "metadata": { "title": "Unstake SUI", "intent": "validator_unstake" },
  "dry": false
}
```

`destinationAsset` is native SUI's asset id — it is what the action coin resolves to — never a Move coin type. Native SUI is listed with an **empty** `contractAddress` in `GET /api/v1/supported_tokens`. Always send `type: "sui"` explicitly: it may be omitted, but an omitted `type` is recorded as the literal `"evm"` and every response for that execution then reports `"type": "evm"` back to you. No API key is needed on this endpoint. A TON origin wallet also sends `publicKey`.

`"dry": true` gives you a priced preview that signs and persists nothing, returns `result.details.networkFee`, echoes your steps back verbatim and omits the signing payload. A dry run does read the chain — it resolves the live version of every object you named — so a `StakedSui` a previous unstake already consumed is caught at preview time rather than surviving to the real create. It is not free and not instant for that reason.

What the service does **not** check is that an object is of the type your step uses it as. A `StakedSui` id is just an object id on the wire, and a mismatched one fails inside the Move call rather than at validation. Re-reading the stake and checking its type immediately before the create is worth doing yourself, particularly on an out-operation where a failed create has also spent a quote deadline.

***

## Mode 2 — out-operation (unstake, then bridge the proceeds out)

An out-operation runs your steps on Sui and bridges the output to another chain. Sui is the **origin** here, so the Sui asset goes in `quote.originAsset` and the far side in `quote.destinationAsset`. Sui is a destination only, so a `sui` → `sui` pair is a `400`.

One of your commands must be the **producer**: the one that pays the 1CLICK deposit address. The service **rewrites its amount** so the commission comes out of the same total, so the producer must be one of exactly two whitelisted shapes or the create fails with `outOperation requires a whitelisted transfer to the {DEPOSIT_ADDRESS} (1click deposit) in the Sui steps`. Both flows below use the first shape: a `splitCoins` whose `amounts[0]` a later `transferObjects` pays out.

The second whitelisted shape is a `moveCall` of `0x2::pay::split_and_transfer<T>` with the amount at `arguments[1]` and the recipient at `arguments[2]` — remember the target package needs the full 64-hex spelling of `0x2`. Anything else is not recognised, and the create fails rather than silently no-opping: a no-op would bridge out an amount the commission was never taken from.

Both argument **types** in the producer are load-bearing rather than stylistic. The amount must be a pure `u64`, because the service cannot rewrite opaque bytes, and the `{DEPOSIT_ADDRESS}` recipient must be a pure `address`, because that is what the whitelist matches on. Getting either wrong lands in the same `400` quoted above; only its suffix differs — `out-operation amount is of type "raw", expected u64` in the first case, `producer transfer to 0x… not found in steps` in the second. On the `splitCoins` shape the amount must be `amounts[0]`, and the transfer must take that split's **first** output with a `nestedResult` of `index: 0` — a whole-tuple `result` matches only when the split has exactly one amount.

### Unstake and bridge the proceeds out

Six commands. Use `request_withdraw_stake_non_entry`, which **returns** a `Balance<SUI>` instead of transferring a coin to the sender, convert that balance to a coin with `0x2::coin::from_balance`, and **merge it into the action coin** rather than paying it out directly. The merge consumes the conversion's return value and leaves the producer in the exact canonical shape the whitelist matches: a `splitCoins` off `{ACTION_COIN}`.

```jsonc
"steps": [
  {
    "metadata": { "name": "request_withdraw_stake_non_entry",
                  "description": "Withdraw the StakedSui as a Balance<SUI> we can still spend" },
    "command": "moveCall",
    "target":  "0x0000000000000000000000000000000000000000000000000000000000000003::sui_system::request_withdraw_stake_non_entry",
    "arguments": [
      { "kind": "object", "objectId": "0x0000000000000000000000000000000000000000000000000000000000000005",
        "shared": true, "mutable": true },
      { "kind": "object", "objectId": "<your StakedSui object id>" }
    ]
  },
  {
    "metadata": { "name": "coin::from_balance", "description": "Balance<SUI> → Coin<SUI>" },
    "command": "moveCall",
    "target":  "0x0000000000000000000000000000000000000000000000000000000000000002::coin::from_balance",
    "typeArguments": [ "0x2::sui::SUI" ],
    "arguments": [ { "kind": "result", "command": 0 } ]
    // no argument for the trailing &mut TxContext
  },
  {
    "metadata": { "name": "Merge", "description": "Fold the unstaked coin into the action coin" },
    "command": "mergeCoins",
    "coin":    { "kind": "object", "objectId": "{ACTION_COIN}" },   // destination — NOT consumed
    "sources": [ { "kind": "result", "command": 1 } ]               // consumed
  },
  {
    "metadata": { "name": "Split for the bridge",
                  "description": "Carve the bridged amount out of the action coin (the service rewrites it)" },
    "command": "splitCoins",
    "coin":    { "kind": "object", "objectId": "{ACTION_COIN}" },
    "amounts": [ { "kind": "pure", "type": "u64", "value": "2000000000" } ]   // see below
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

Note the type argument is written `0x2::sui::SUI` — the shorthand is legal there — while the `target` package is the full 64-hex form of `0x2`.

**This shape withdraws the whole stake**, whatever the producer amount is, and everything beyond what you bridge stays with the intermediary as liquid SUI. If the stake is larger than what you are bridging, use the partial shape below.

#### Unstake only the bridged amount

Seven commands: the same array with a `0x3::staking_pool::split` inserted ahead of the withdraw, so the rest stays staked.

```
0x0000000000000000000000000000000000000000000000000000000000000003::staking_pool::split(
  stake:  &mut StakedSui,
  amount: u64,
  ctx:    &mut TxContext,
): StakedSui
```

It is **public and non-entry**, which is what makes it usable here: it _returns_ the new `StakedSui` as a result the withdraw can take by value, while the original is only borrowed — so the leftover stays with the intermediary and needs no transfer of yours.

```jsonc
"steps": [
  {
    "metadata": { "name": "staking_pool::split", "description": "Carve the unstaked slice off the StakedSui" },
    "command": "moveCall",
    "target":  "0x0000000000000000000000000000000000000000000000000000000000000003::staking_pool::split",
    "arguments": [
      { "kind": "object", "objectId": "<your StakedSui object id>" },   // &mut — borrowed, not consumed
      { "kind": "pure",   "type": "u64", "value": "<the unstaked PRINCIPAL, in MIST>" }
      // no argument for the trailing &mut TxContext
    ]
  },
  {
    "metadata": { "name": "request_withdraw_stake_non_entry", "description": "Withdraw the slice as a Balance<SUI>" },
    "command": "moveCall",
    "target":  "0x0000000000000000000000000000000000000000000000000000000000000003::sui_system::request_withdraw_stake_non_entry",
    "arguments": [
      { "kind": "object", "objectId": "0x0000000000000000000000000000000000000000000000000000000000000005",
        "shared": true, "mutable": true },
      { "kind": "result", "command": 0 }
    ]
  },
  {
    "metadata": { "name": "coin::from_balance", "description": "Balance<SUI> -> Coin<SUI>" },
    "command": "moveCall",
    "target":  "0x0000000000000000000000000000000000000000000000000000000000000002::coin::from_balance",
    "typeArguments": [ "0x2::sui::SUI" ],
    "arguments": [ { "kind": "result", "command": 1 } ]
  },
  {
    "metadata": { "name": "Merge", "description": "Fold the unstaked coin into the action coin" },
    "command": "mergeCoins",
    "coin":    { "kind": "object", "objectId": "{ACTION_COIN}" },
    "sources": [ { "kind": "result", "command": 2 } ]
  },
  {
    "metadata": { "name": "Producer split", "description": "Carve the bridged amount" },
    "command": "splitCoins",
    "coin":    { "kind": "object", "objectId": "{ACTION_COIN}" },
    "amounts": [ { "kind": "pure", "type": "u64", "value": "<producer amount, in MIST>" } ]
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

**The two amounts are different, and only one of them is rewritten.** The producer split at step 4 is the one the service rewrites to `quote.amount - networkFee`. The principal split at step 0 is yours and is left alone, so it has to stay at the **full** amount — the withdrawal has to cover the producer _and_ the commission, which is drawn one command after the merge at step 3.

**`split` asserts three things about its amount, and the third is the surprising one:**

```
split_amount <= principal
split_amount >= 1 SUI
principal - split_amount >= 1 SUI
```

So a partial unstake can never take the **whole** principal — that is what the whole-object shape above is for — and a stake under 2 SUI cannot be split at all. The two threshold breaches abort with code **18** (`EStakedSuiBelowThreshold`) and an over-ask with code **3** (`EInsufficientSuiTokenBalance`), both in the **first** command, before anything else in the array runs.

**The rewards are not split pro rata**, because they are not in the object. A `StakedSui` carries `principal` plus the `stake_activation_epoch` the reward is computed from at withdrawal, and `split` copies that epoch onto both halves — so each half earns its own share and the proceeds are at least the split amount. That one-sided direction is the reason the producer is always covered.

### The create request

```jsonc
POST /api/v1/executions/0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5
x-api-key: <your key>
{
  "version": "1.0",
  "type": "sui",
  "outOperation": true,
  "quote": {
    "originAsset":       "<asset id for native SUI>",
    "amount":            "2000000000",
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

`type: "sui"` must agree with the **origin** chain on an out-operation. List the Sui asset ids from `GET /api/v1/supported_tokens?flow=outOperation` — Sui appears in `result.in` on that flow, since it is the side being bridged _from_; with `?flow=inOperation` it appears in `result.out` instead. Native SUI is listed with an **empty** `contractAddress`. `quote.recipient` is optional and out-operation only (it is a `400` on a bridge-in); left off, the service defaults it to the origin wallet in the path.

A **missing** `x-api-key` is a flat `401` from the middleware, before any validation. An **invalid** one passes the middleware and is only rejected when the quote is fetched, after your steps have been validated — so a bad key on a bad payload surfaces as the payload's `400` first.

Quote defaults, if you leave them out: `swapType` is `EXACT_INPUT`, `slippageTolerance` is `100` basis points when zero or absent, `deadline` is ten minutes out, and `version` is `"1.0"`.

Price it with `"dry": true` first. You need `details.networkFee` to know what the commission will take out of the unwound proceeds — on the shapes in this guide it is drawn after the merge, not from the liquid balance — and a dry request is exempt from the one-live-execution rule, so a preview never collides with a running execution.

#### What to put in the producer amount

The service overwrites the producer amount outright, and the rewrite is what lands on chain. Nothing you put in that slot survives — only its **kind** and **type** are checked, so any legal pure `u64` produces byte-identical signed output. Send the conventional value anyway, so the payload reads as what it means:

* **`EXACT_INPUT`** — send the same figure as `quote.amount`, a pure `u64` in MIST. The service rewrites it to `quote.amount - networkFee`, so the producer and the commission together total the amount the user fixed, and it re-quotes at the net figure so the quote matches what the producer actually deposits. A `networkFee` at or above `quote.amount` is a `400`.
* **`EXACT_OUTPUT`** — send the `{AMOUNT_IN}` placeholder. It substitutes the origin commitment (`quote.amountIn` plus the network fee), and the carve then overwrites the same field with `quote.amountIn`, so the producer pays `amountIn` and the user's total debit is producer plus commission.

Either way, do not present the value you sent, or the value a dry run echoes, as the amount that gets transferred. `{MIN_AMOUNT_OUT}` is a `400` on an out-operation — the steps run before the bridge, so there is no destination `minAmountOut` to splice in — and `{AMOUNT_IN}` is a `400` on anything other than `EXACT_OUTPUT`. 1CLICK refunds unused slippage to the intermediary.

How the response's quote figures relate to the commission differs by swap type, which matters before you display them. On `EXACT_INPUT` the service re-quotes at `quote.amount - networkFee` and returns _that_ quote, so its figures are already net. On `EXACT_OUTPUT` the preliminary quote is kept and the user's commitment is `amountIn + networkFee`, so the response figures are the raw numbers with the commission sitting outside them. Either way the echoed producer amount is the carved one, since that field is the one the service rewrote — but on the `201` every pure argument, that one included, comes back as `{"kind": "pure", "type": "raw", "value": "<hex>"}`, so read the `u64` out of eight little-endian bytes rather than expecting a decimal string.

That split describes the `201` only. A `dry` preview returns before the re-quote, so it always carries the preliminary quote taken at the full `quote.amount`: on `EXACT_INPUT` its `amountOut` / `minAmountOut` are gross, and higher than the real create will report, even when `networkFee` is present. Price the fee with a preview, then read the quote figures off the `201`.

#### Where the commission is drawn

The service takes its commission as a `splitCoins` off the action coin plus a `transferObjects` paying the service-fee address, and **where in the array that pair lands depends on your steps**:

* If any step is a `mergeCoins` whose **destination** is the action coin — and whose `sources` do not also name it, since a self-merge is an abort rather than a funding — the pair is emitted **one command after the last such merge**. That is the shape of both out-operation arrays above, so the commission is drawn out of a coin the unstake has already funded.
* If no step does, the pair is prepended **ahead of step 0** and can only draw on what the intermediary already held. That is the shape of the steps-only array above.

A `mergeCoins` destination is the only funding effect the service can read off the wire — Sui types it as a `&mut` borrow, so the coin provably survives the command that certifies the funding. Funding the action coin through a `moveCall` that takes it by `&mut Coin<T>` is invisible to that scan and is left fail-closed: the pair stays ahead of step 0 and the split aborts if the balance does not already cover the fee. Use a `mergeCoins` step whenever you want the proceeds to fund the commission.

#### The liquid-fee precondition (steps-only only)

**On the steps-only shape in this guide the intermediary must already hold at least the network fee in liquid SUI before the execution starts.** That array never merges anything into the action coin — the entry-point withdraw hands the proceeds straight to the intermediary as a new object instead — so the commission is carved before step 0, against whatever the intermediary held on its own:

* A **zero** balance is caught cleanly at create, with the message belonging to that flow — the steps-only wording quoted earlier, or `intermediary holds no sui action coin: no <coinType> coin object and no accumulator balance` on an out-operation.
* A balance **between zero and the fee** is not caught by a field check. The carve itself aborts, and the service names it for you rather than leaving you an index to decode: `400 sui transaction simulation reverted: the <amount> commission split aborted at command N: … (the action coin does not hold the commission at that point in the transaction)`.

The out-operation shapes do **not** carry this precondition, because their `mergeCoins` moves the carve behind the unstake. An intermediary holding only dust of SUI can still unwind a large stake and bridge the proceeds out.

What none of this constrains is the bridged amount. Because the proceeds are merged in before the producer split, the amount you can bridge out is the intermediary's liquid balance **plus** the unstaked value. Checking the requested amount against the liquid balance by itself will reject exactly the case these flows exist for.

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
* **Consume everything a command returns.** The `Balance<SUI>` from the non-entry withdraw, the coin `from_balance` builds, the `StakedSui` a `staking_pool::split` returns, a `splitCoins` **output** — Sui aborts on an unconsumed result that has no `drop`. The coin a `splitCoins` borrowed is not a result and needs nothing; an unread output is what kills the transaction. This is the one rule with no create-time field check behind it: it is caught, if at all, by simulation — normally the fee probe, which fails closed, and otherwise the second, pre-sign simulation, which fails open on a transport error. Write the array correctly rather than relying on either to catch it.
* **One live Sui execution per wallet at a time.** Any non-terminal Sui execution blocks the next one, whichever side Sui is on, so two Sui out-operations to _different_ chains collide where the EVM rule would allow both. A second create is `409`. The slot frees when the blocking row reaches `SUCCESS`, `DEPOSIT_FAILED`, `OPERATION_FAILED` or `EXPIRED` — which, for an out-operation, means after the bridge settles. A `dry` request is exempt. Practically: a stake and its unstake cannot be back to back; the first has to finish.
* **Do not add gas, a fee transfer, or a budget**, and never name the service's sponsor or fee address. `0x2::coin::redeem_funds` and everything in `0x2::funds_accumulator` are reserved. You never pay SUI for gas even when SUI is the coin being unwound.
* **At most 50 steps**, and a request body of at most 256 KB — both deployment defaults rather than protocol constants.

A steps-only or out-operation create simulates your steps twice before anything is signed: first the fee probe, at a stand-in commission, then the assembled transaction with the real one. A step that would revert therefore fails the probe, as `400 sui transaction simulation reverted: fee probe aborted at command N: … (the probe runs on stand-in amounts, so a step with an amount-dependent minimum can abort here even when the steps are sound)`, and a probe that cannot run is a `502` rather than a pass. Only the second simulation fails **open** on a transport error, so treat that one as a good backstop rather than a guarantee. On a `dry` preview a failed probe does not `400` either — it answers `200` with `networkFee` omitted. One exception: a preview still resolves every object your steps name, at its live version, and a step naming an object that does not exist is a `400` on the preview too, since no version of that payload could ever execute.

#### Reading an abort's command index

When you do get an abort, **read the command index as absolute**, and reconstruct the offset in two parts. The message is `fee probe aborted at command N` when the probe caught it and `command N aborted` when the second simulation did; N means the same thing in both.

First, the service prepends **zero to two** commands ahead of your step 0, for materialising the action coin: nothing at all when it came from a single owned coin object, a `mergeCoins` when several had to be folded together, a `0x2::coin::redeem_funds` call when it came from a credited accumulator balance, and both when the intermediary held some of each. (The withdrawal itself is a transaction _input_, not a command, so a credited balance costs one command, not two.)

Second, the commission `splitCoins` and its `transferObjects` add two more commands, but only steps at or after the pair are displaced by them — and where the pair sits depends on your array, as described under where the commission is drawn. On the out-operation shapes above the pair follows the merge, so your steps before it carry only the first offset and the steps after it carry both.

You cannot infer either part from the payload alone: neither the prepended block nor the commission pair appears in the echoed `steps`, so an abort message is the one place they are visible. An abort that lands on the commission split itself says so in words rather than leaving you to decode an index.

#### Checking a Move parameter is really by value

Every "must be consumed" judgement above rests on whether a Move parameter takes its value by value or by reference, and no request payload can tell you which. Read it off the chain instead: a function's signature reports each parameter's `reference` as `mutable`, `immutable`, or **null for by value**. That is how you confirm `request_withdraw_stake` consumes its `StakedSui` while `staking_pool::split` only borrows the one it splits from.

### Sign and submit

Identical to every other destination. The create response returns `result.details.payload` and `result.details.signingStandard` — the standard is your **origin wallet's** (`erc191` for EVM, `raw_ed25519` for Solana, `nep413` for NEAR, `tip191` for Tron, `sep53` for Stellar, `ton_connect` for TON). Sign that payload and post it:

```
POST /api/v1/executions/{wallet}/submit
{ "signature": "…", "executionId": "…" }
```

An ed25519 origin (Solana, NEAR, Stellar) adds `publicKey`; a TON origin adds both `publicKey` and a `tonConnect` envelope. You never handle the Sui transaction bytes and you never pay SUI for gas — the service sponsors the transaction and recovers the cost through the commission it carves out of the action coin.

Both modes here broadcast as soon as your signature lands, so they finish far inside the epoch window a signed Sui transaction is valid for.
