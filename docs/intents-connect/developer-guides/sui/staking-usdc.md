---
icon: book-open
---

# Staking USDC

A worked, self-contained guide to putting USDC to work on Sui through the service by supplying it to **Suilend's Main Market** to earn lending yield. It covers both execution modes — **steps-only**, where your Sui intermediary already holds the USDC, and **bridge-in**, where the USDC arrives from another chain and is supplied in the same signed request.

Suilend is the only venue USDC has here — validator staking is SUI-only. Suilend also takes native SUI, through the same call with four values changed; see **Supplying SUI instead of USDC** at the end.

### The venue

|                                    | **Suilend Main Market supply**                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Coin                               | USDC                                                                                                   |
| What you get                       | `Coin<CToken<MAIN_POOL, USDC>>` — an interest-bearing claim on the reserve, owned by your intermediary |
| Yield source                       | borrowers in the lending market                                                                        |
| Minimum                            | none beyond the reserve's own                                                                          |
| Move call                          | `deposit_liquidity_and_mint_ctokens`                                                                   |
| Coin is taken                      | by value — the call consumes it                                                                        |
| Returns something you must consume | yes, the minted cToken coin                                                                            |

The call takes the coin **by value**, which is what makes it usable on a bridge-in: the coin it consumes can be the action coin itself, and every other argument is a shared object, so nothing owned needs naming. That matters because a bridge-in signs its bytes before your deposit lands and therefore may not reference an owned object at all.

"Staking" is used loosely here. A Suilend supply is a lending deposit you can redeem whenever you like, subject to the market's outflow rate limiter — a large redeem can be refused when the market's window is exhausted, and the fix is a smaller amount.

### The two execution modes

The steps are nearly identical in both modes. What differs is the endpoint, whether a `quote` and an API key are involved, and how the supplied amount is chosen.

|                          | **steps-only**                           | **bridge-in**                                    |
| ------------------------ | ---------------------------------------- | ------------------------------------------------ |
| Endpoint                 | `POST /api/v1/executions/{wallet}/steps` | `POST /api/v1/executions/{wallet}`               |
| Carries a `quote`        | no                                       | yes                                              |
| `x-api-key` header       | not required                             | **required**                                     |
| Precondition             | the intermediary already holds the USDC  | the USDC is bridged in from the origin chain     |
| Supplied amount          | a concrete `u64` you compute             | the whole action coin, passed by value           |
| May name an owned object | yes                                      | **no** — shared objects and `{ACTION_COIN}` only |
| Swap type                | not applicable                           | `EXACT_INPUT` or `EXACT_OUTPUT`                  |
| Lifecycle                | create → sign → broadcast                | create → sign → deposit → sweep → broadcast      |

### Addresses (Sui mainnet)

| Thing                                                | Value                                                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Call package (v23, latest at the time of writing)    | `0x4989dd9a04581ee50d0d0b3dd99b56c1a86bc363b57dc5b64264832c97e72645`                     |
| Type package (original publish)                      | `0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf`                     |
| `LendingMarket<MAIN_POOL>` — shared, taken by `&mut` | `0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1`                     |
| `Clock` — shared, read-only                          | `0x0000000000000000000000000000000000000000000000000000000000000006`                     |
| `MAIN_POOL` type tag                                 | `0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL` |
| `reserve_array_index` for USDC                       | `7`                                                                                      |
| `reserve_array_index` for SUI                        | `0`                                                                                      |

**Call the latest package, tag types with the original.** A Sui package upgrade publishes a new address, and the old one stays callable — but `LendingMarket` carries a `version` field that the newest module asserts against, so a `target` must point at the latest package. A Move type, by contrast, keeps the address of the package that defined it, so `MAIN_POOL` and `CToken` must be written with the original publish address even though the call targets the newer one. Mixing the two up produces a call that resolves and then fails type-checking, which is the classic Sui upgrade bug. Re-resolve the latest version from the chain's package-version history rather than trusting a manifest.

A Suilend upgrade publishes a **new package at a new address** every time — v21 (`0xe53906c2…`) and v22 (`0x7c82c37d…`) are the two immediate predecessors of the address above — so re-resolve the head of the version lineage from chain before you build rather than copying the address out of this table.

**`reserve_array_index` is a position, not an id.** It is an index into the lending market's `reserves` vector, and it shifts if Suilend ever reorders that vector. Passing the wrong index aborts rather than quietly depositing into another reserve, so the failure is safe — but re-read it off the live market object rather than trusting the table above: `reserves[7].coin_type` is USDC (6 decimals) as of this writing.

#### Coin type and asset id

| Token | Decimals | Move coin type                                                                   |
| ----- | -------- | -------------------------------------------------------------------------------- |
| USDC  | 6        | `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC` |

`destinationAsset` and `quote.destinationAsset` want the **asset id**, never a Move coin type — the service resolves the id against its own token list and derives the coin type itself. List the ids from `GET /api/v1/supported_tokens`, and note which side Sui appears on: with `?flow=inOperation` (or no flow at all) Sui tokens are in `result.out`, because Sui is a bridge destination and never a bridge source. With `?flow=outOperation` they are in `result.in` instead.

The listing is not a capability check — it is the upstream token catalogue filtered by chain, and it says nothing about whether this deployment has Sui destinations enabled. The probe for that is `GET /api/v1/executions/{wallet}/intermediary` returning a non-null `sui`; a `null` there means either not enabled or a derivation failure, and either way you cannot build a Sui execution right now.

Amounts everywhere are atomic: 25 USDC is `25000000`.

***

## Mode 1 — steps-only (the intermediary already holds the USDC)

### Supplying an amount, keeping the remainder

Three commands: split the amount off the action coin, supply it, then consume both the minted cToken and the borrowed action coin in one transfer.

```jsonc
"steps": [
  {
    "metadata": { "name": "Split", "description": "Take the supply amount out of the coin" },
    "command": "splitCoins",
    "coin":    { "kind": "object", "objectId": "{ACTION_COIN}" },
    "amounts": [ { "kind": "pure", "type": "u64", "value": "25000000" } ]   // 25 USDC (6 decimals)
  },
  {
    "metadata": { "name": "deposit_liquidity_and_mint_ctokens",
                  "description": "Supply USDC to Suilend Main Market and mint cTokens" },
    "command": "moveCall",
    "target":  "0x4989dd9a04581ee50d0d0b3dd99b56c1a86bc363b57dc5b64264832c97e72645::lending_market::deposit_liquidity_and_mint_ctokens",
    "typeArguments": [
      "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL",
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
    ],
    "arguments": [
      { "kind": "object", "objectId": "0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1",
        "shared": true, "mutable": true },                          // the lending market, by &mut
      { "kind": "pure",   "type": "u64", "value": "7" },            // reserve_array_index for USDC
      { "kind": "object", "objectId": "0x0000000000000000000000000000000000000000000000000000000000000006",
        "shared": true },                                           // the Clock, by & — so no "mutable"
      { "kind": "nestedResult", "command": 0, "index": 0 }          // the split coin, taken by value
      // no argument for the trailing &mut TxContext
    ]
  },
  {
    "metadata": { "name": "Sink", "description": "Keep the cTokens and consume the action coin" },
    "command":   "transferObjects",
    "arguments": [
      { "kind": "result", "command": 1 },                           // the minted cToken coin
      { "kind": "object", "objectId": "{ACTION_COIN}" }             // the borrowed action coin
    ],
    "recipient": { "kind": "pure", "type": "address", "value": "{INTERMEDIARY}" }
  }
]
```

The Move signature the middle step targets is:

```
deposit_liquidity_and_mint_ctokens<P, T>(
  market: &mut LendingMarket<P>,
  reserve_array_index: u64,
  clock: &Clock,
  deposit: Coin<T>,
  ctx: &mut TxContext,
): Coin<CToken<P, T>>
```

Three things about that mapping are worth stating explicitly, because each one is a `400` or an abort if you get it wrong:

* **The type arguments are `[P, T]`** — the pool marker first, the deposited coin type second. Both must be written in full 64-hex form here, as must the `target` package and every `objectId`.
* **`mutable` belongs only on the market.** The `Clock` is taken by `&`, so it is `"shared": true` with no `mutable` key. Setting `mutable` without `shared` is a `400`.
* **Nothing is sent for `&mut TxContext`.** The runtime supplies it.

The third step is not bookkeeping you can drop. `splitCoins` **borrows** its coin rather than consuming it, and the deposit **returns** a cToken coin — and Sui aborts a transaction that ends with an unconsumed `Coin<T>` **result**. One `transferObjects` naming both objects settles both obligations in a single command.

The precise rule is worth knowing, because it decides whether the sink is mandatory or merely tidy. What aborts is an unconsumed _result_; an unconsumed _input_ coin is simply written back to its owner. So when the action coin resolves to coin objects the trailing transfer is a harmless self-transfer, and when it resolves to a credited balance — the case after every bridge-in — the action coin **is** a result and the transfer is load-bearing. You do not get to choose which: it is decided at build time from what the intermediary happens to hold. Write steps that are correct either way.

**Leave something behind on a steps-only supply.** If you deposit the whole balance, the intermediary ends up holding zero USDC, and the next steps-only execution over it — including the redeem that gets your position back — is refused with `the intermediary holds no <coinType>: neither a coin object nor an accumulator balance`. Depositing an amount and leaving the remainder keeps the position reachable.

### The create request

```jsonc
POST /api/v1/executions/0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5/steps
{
  "version": "1.0",
  "type": "sui",
  "destinationAsset": "<asset id for USDC on Sui>",
  "steps": [ /* as above */ ],
  "metadata": { "title": "Supply to Suilend Main Market", "intent": "suilend_supply" },
  "dry": false
}
```

`type` may be omitted — the service infers the family from the destination asset — but an omitted `type` is recorded as the literal `"evm"`, and every response for that execution then reports `"type": "evm"` back to you. Always send it explicitly. `metadata` is free-form and never interpreted. No `x-api-key` is needed on this endpoint. A TON origin wallet also sends `publicKey`.

Send `"dry": true` first if you want the fee before committing. A dry run signs nothing and persists nothing, returns `details.networkFee` and omits the signing payload entirely. Its echoed `steps` are your steps back verbatim — note that a **real** create echoes something different, the re-rendered user block of the signed transaction, in which every pure argument comes back as `type: "raw"` carrying its encoded bytes.

One Sui-specific note: a dry run wants real steps. The action-coin check runs before the preview returns, so an explicit `"steps": []` is a `400`. Omitting `steps` altogether is carved out and does return an empty shell, but a preview built that way prices nothing useful — send the steps you intend to execute.

### How much can be supplied

The service takes its commission **on chain**, as a split out of the action coin. It is emitted at the first point the action coin is provably funded: one command past the last of your steps that `mergeCoins` another coin **into** `{ACTION_COIN}`, and ahead of every step when none does. Every shape in this guide is the second case — none of them merges into the action coin — so on a steps-only execution the action coin your steps see is already net of the fee, and an amount you split off it must satisfy:

```
amount <= the intermediary's USDC balance - networkFee
```

`networkFee` comes back on both a dry preview and a real create as `result.details.networkFee`, a decimal string in the **action coin's atomic units**. There is no separate `serviceFee` field, and the commission does not appear in the echoed `steps`.

Passing `{ACTION_COIN}` by value instead — the bridge-in shape below — avoids the arithmetic entirely: it supplies exactly what is left after the carve, whatever that is.

***

## Mode 2 — bridge-in (bridge the USDC in, then supply it)

A bridge-in brings the USDC from another chain and supplies it in one signed request. It is pre-signed at create: the `201` already carries a populated `details.messageToSign`, so you sign immediately and then send the deposit — there is no deferred-signing round trip to poll for.

### The steps

Pass the whole action coin by value. That is two commands, because the minted cToken still has to be consumed:

```jsonc
"steps": [
  {
    "metadata": { "name": "deposit_liquidity_and_mint_ctokens",
                  "description": "Supply the bridged USDC to Suilend Main Market" },
    "command": "moveCall",
    "target":  "0x4989dd9a04581ee50d0d0b3dd99b56c1a86bc363b57dc5b64264832c97e72645::lending_market::deposit_liquidity_and_mint_ctokens",
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
      { "kind": "object", "objectId": "{ACTION_COIN}" }              // the bridged coin, by value
    ]
  },
  {
    "metadata": { "name": "Keep the cTokens", "description": "Move the minted cToken coin to the intermediary" },
    "command":   "transferObjects",
    "arguments": [ { "kind": "result", "command": 0 } ],
    "recipient": { "kind": "pure", "type": "address", "value": "{INTERMEDIARY}" }
  }
]
```

**Do not carve `{MIN_AMOUNT_OUT}` off the action coin.** By the time your first step runs the commission has already been split off, so the action coin is worth exactly `{MIN_AMOUNT_OUT}` — splitting that amount out of it yields the whole coin plus a live zero-value remainder, and the transaction aborts on the unconsumed result. Pass the coin by value when you mean "all of it". Reserve `{MIN_AMOUNT_OUT}` for a Move call's own amount operand, such as a slippage floor — and leave it as the sentinel. Do not resolve it yourself from a preview: a bridge-in is priced by a probe that cannot draw on a delivery which has not landed, so the service reserves only what its own balance of that coin covers and shrinks the substituted figure to fit. The sentinel shrinks with it; a literal cannot, and the create is refused.

**Every argument must be shared or `{ACTION_COIN}`.** A bridge-in's bytes are signed before the deposit lands and carry no object version that could be refreshed later, so an owned object's version would go stale before they are broadcast; naming one is a `400` (`a pre-signed sui execution may not reference an owned object`). The shape above satisfies this: the lending market and the clock are both shared, and the deposit needs no owned position object. That is the main reason Suilend works for a bridge-in where other protocols do not.

The test is "is this an `object` argument without `shared: true`", not "does it look like an address" — so an `{INTERMEDIARY}` sentinel sitting in an `objectId` counts as an owned reference too. `{ACTION_COIN}` is the only exemption.

There is also nothing to set up on a first deposit. The venue needs no position object created up front, so a first-time user's steps are byte-identical to a repeat user's. The one first-time cost is fee-side and handled by the service: a wallet's very first Sui deposit carries an extra allowance in the bridge-in fee.

### The create request

```jsonc
POST /api/v1/executions/0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5
x-api-key: <your key>
{
  "version": "1.0",
  "type": "sui",
  "quote": {
    "originAsset":       "<origin asset id>",
    "amount":            "6600000",
    "destinationAsset":  "<asset id for USDC on Sui>",
    "slippageTolerance": 100,                          // basis points
    "swapType":          "EXACT_INPUT",
    "deadline":          "2026-08-19T12:34:56.000Z"
  },
  "steps": [ /* as above */ ],
  "metadata": { "title": "Supply to Suilend Main Market", "intent": "suilend_supply" },
  "dry": false
}
```

`type: "sui"` must agree with the **destination** chain here. A `type` that disagrees with the action chain is a `400` naming the mismatch.

A **missing** `x-api-key` is a flat `401` from the middleware, before any validation runs. An **invalid** one is different: it passes the middleware and is only rejected when the quote is fetched, which happens after your steps have been validated — so a bad key on a bad payload surfaces as the payload's `400` first.

Four fields default if you leave them out: `swapType` to `EXACT_INPUT`, `slippageTolerance` to `100` basis points when zero or absent, `deadline` to ten minutes out, and `version` to `"1.0"`.

#### EXACT\_INPUT vs EXACT\_OUTPUT

* **`EXACT_INPUT`** — `quote.amount` is in the **origin** coin's atomic units. The user fixes what they spend; the supplied amount is whatever the bridge delivers, net of slippage and commission.
* **`EXACT_OUTPUT`** — `quote.amount` is in the **destination** (Sui) coin's atomic units. The user fixes the amount that lands on Sui, and the origin side is grossed up to cover it.

Either way the whole-coin shape supplies exactly what arrives, so neither needs the amount wired into a step.

If you do need to check the delivered amount against a floor, the figure to check is not the amount the user typed. The coin the deposit call receives is the **guaranteed** delivery minus the commission — and on a bridge-in response that is exactly what `quote.minAmountOut` already is. The service nets the commission out of both `quote.minAmountOut` and `quote.amountOut` before echoing them, on the dry path and the real one alike. Do not subtract `details.networkFee` from it as well — that charges the fee twice and rejects quotes that would have succeeded. (The gross figure, which the signed transaction reserves, is not exposed; `minAmountOut` in the response is the spendable half.) The one state to guard is a preview that came back **without** `networkFee`: it could not be priced, so its figures are the raw quote with no commission carved out at all. Treat that as no usable quote rather than comparing it against anything.

On `EXACT_INPUT` the Sui-side figure is not knowable before the quote comes back, so a preview is the only way to see it. On `EXACT_OUTPUT` you already know it: the figure is the `amount` you asked for. The service quotes at `amount + networkFee` and then nets the commission back out before echoing, and an `EXACT_OUTPUT` quote carries no output-side slippage haircut — the service rejects a quote whose `minAmountOut` is anything other than its `amountOut`, because on this swap type the slippage allowance sits on the input side, inside `quote.amountIn`. So do **not** discount the figure by `slippageBps` or by `networkFee`; neither applies.

Two probes, though, not one. On a real create the commission the quote is grossed up by is measured before the quote, and the commission netted back out is measured again while the transaction is assembled. Both price the same transaction shape, so they normally agree, but the echoed figure is `amount` plus however much they differ by — it can land just under the amount you asked for. A dry run uses a single probe for both halves, so a preview always shows exactly `amount` and never reveals that drift. If you are checking the delivered amount against a floor, leave a margin rather than sitting on it, and re-read `quote.minAmountOut` off the `201`.

**A preview is a quote, not a commitment.** The create runs its own fee probe, and on `EXACT_OUTPUT` it re-quotes at an amount grossed up by that freshly measured fee — so `details.networkFee` and `quote.minAmountOut` can both move between the dry round and the signed transaction. Re-read them off the `201` rather than carrying the preview's figures forward into a check or a displayed amount.

One thing to carry into step 3 of the lifecycle below: on `EXACT_INPUT` the origin deposit is the amount the user entered, but on `EXACT_OUTPUT` it is `quote.amountIn` from the create response, verbatim and already atomic.

#### Lifecycle

1. **Create.** The `201` carries the quote, `details.networkFee`, and the signing payload under `result.details`.
2. **Sign** `details.payload` with your origin wallet, using the `signingStandard` the response names, and `POST /api/v1/executions/{wallet}/submit`. The reply is `{"status": "SIGNED_PENDING_DEPOSIT"}` while the deposit is still outstanding, or `{"status": "SIGNING"}` if it already settled.
3. **Send the deposit** to `quote.depositAddress` on the origin chain and report it with `POST /api/v1/executions/deposit/submit`.
4. **Poll** `GET /api/v1/executions/{wallet}?id=<executionId>` through `CREATED` → `DEPOSIT_PENDING` → `DEPOSIT_PROCESSING` → `OPERATION_PENDING` → `OPERATION_PROCESSING` → `SUCCESS`.

Two things about a Sui bridge-in specifically. `quote.recipient` is a derived **inbox** address belonging to your intermediary, not the intermediary itself — do not label it as the user's address. And there is one extra hop between "deposit settled" and "transaction broadcast", normally seconds, while the service sweeps the delivery into the intermediary's credited balance. The execution can sit at `OPERATION_PENDING` or `OPERATION_PROCESSING` for that hop; nothing about it needs handling on your side.

**A bridge-in costs materially more than the same steps run steps-only.** Its fee includes an allowance for that sweep — a second, service-funded transaction — plus a further allowance on a wallet's very first Sui deposit. Never present the two fees as comparable, and always quote a bridge-in with a bridge-in preview.

**A surplus stays behind.** The signed transaction reserves exactly the guaranteed `minAmountOut`, so anything the bridge delivers above that stays credited to the intermediary rather than being supplied. It is not lost — a later steps-only execution picks it up as the action coin — but a UI that reports "supplied" without accounting for it understates the user's balance.

***

### Rules that apply here

* **Name the action coin.** At least one argument must be `{ "kind": "object", "objectId": "{ACTION_COIN}" }`. A pure value carrying the sentinel does not count.
* **Sink the action coin, and sink it last.** Something must consume it by value. A `moveCall` parameter declared `Coin<T>` does, which is why the whole-coin shape needs no extra command; `splitCoins` does **not**, which is why the partial-amount shape does. The command that consumes it has to be the **last** one that mentions it: a PTB value moved by value cannot be named again, so a sink followed by any further reference to `{ACTION_COIN}` aborts with `InvalidValueUsage` instead. That bites hardest where the move is a `moveCall` `Coin<T>` parameter, because appending the trailing `transferObjects` the partial-amount shape ends with is exactly the wrong fix there. Note that this is the one rule with no create-time field check behind it — it is caught, if at all, by simulation. The fee probe does run your steps on every flow, but on a bridge-in it runs relaxed at a stand-in amount and the assembled transaction itself is never simulated, so treat what it catches as a bonus: a missing sink can still reach the chain and abort there.
* **Consume everything your steps return.** The minted cToken is a returned `Coin<CToken<…>>`, and Sui aborts on an unconsumed coin result with `UnusedValueWithoutDrop` — `Coin<T>` has no `drop` ability. The same applies to every `splitCoins` output. A `makeMoveVec` is not a way out of this: it does move its elements, but the `vector<T>` it produces has no `drop` either, so a vector nobody reads aborts the same way and takes the coins inside it down with the transaction.
* **The intermediary must actually hold the USDC** on a steps-only create, as coin objects, as a credited balance, or both. If it holds more USDC coin objects than the service will fold into one action coin **and** no credited balance, the create is refused rather than spending only some of them. That bound is a deployment setting (default **64**, allowed range 1–511), not a protocol constant, so treat the exact number as deployment-specific — the rejection names the figure in force: `intermediary holds too many sui action coin objects: 0x… holds more than <N> <coinType> objects and no accumulator balance`. It only bites when there is no credited balance to fall back on.
* **One live Sui execution per wallet at a time.** Any non-terminal Sui execution blocks the next one, whichever side Sui is on. A second create is `409`.
* **Never name the sponsor or the service's own entry points.** `0x2::coin::redeem_funds` and everything in `0x2::funds_accumulator` are reserved.
* **Do not add gas, a fee transfer, or a budget.** The service sponsors the transaction and emits its own commission commands ahead of yours.

Steps are validated **and simulated** before anything is signed, on every flow, so a step that would revert is normally a descriptive `400` at create rather than a failure on chain. The simulation you will actually hit is the **fee probe**: it runs first, at a stand-in commission, and fails **closed** — an abort in your steps is `400 sui transaction simulation reverted: fee probe aborted at command N: …`, and a probe that cannot run is a `502 sui fee estimation probe failed: …`. Two qualifications: on a steps-only create the assembled transaction is then simulated a second time with the real commission, and only that second call fails **open** on a transport error; on a bridge-in the assembled transaction is never simulated at all, and the probe below is the only verdict. On a `dry` preview a failed probe does not `400` either — it answers `200` with `networkFee` omitted. One exception: a preview still resolves every object your steps name, at its live version, and a step naming an object that does not exist is a `400` on the preview too, since no version of that payload could ever execute. Any other resolution failure fails open and simply leaves `networkFee` off.

One caveat matters more for a supply flow than for most. A bridge-in is priced by simulating the same commands at a **smaller amount** under a different payer, because the real bytes draw on a credited balance that does not exist until the deposit lands. The stand-in amount is capped by what the service itself holds of that coin for pricing, which can be far below a real delivery. So a step that aborts on a small input — a reserve with a deposit floor being the case here — can fail the probe even though the real delivery would have satisfied it. The error says so:

```
400 sui transaction simulation reverted: fee probe aborted at command N …
```

That is a service-side sizing matter rather than a defect in your steps: report it, and prove the array with a steps-only execution against the same coin in the meantime.

**That command index is absolute.** On a bridge-in the service emits exactly **three** commands of its own ahead of your step 0 — one `redeem_funds` materialising the delivered balance, then the commission split and its transfer — so your step 0 is command 3. On a steps-only run it is two to four: nothing for a single coin object or one `redeem_funds` for a credited balance, optionally one `mergeCoins` folding the intermediary's other coin objects into it, then the commission pair. Subtract before concluding that a particular step is at fault. The commission pair is only _prepended_ when none of your steps merges a coin **into** `{ACTION_COIN}`, which is every shape in this guide; an array that does fund the coin that way sees the pair land one command after that merge instead, displacing every step from there on. Those commands are not in the echoed `steps`, so this error is the one place they are visible to you.

One abort you never have to decode by hand: when the failing command _is_ the commission split, the guard says so by name rather than by index — `sui transaction simulation reverted: the <amount> commission split aborted at command N: … (the action coin does not hold the commission at that point in the transaction)`.

### Supplying SUI instead of USDC

Suilend takes native SUI into the same market through the same call, so every step shape, rule and abort in this guide carries over unchanged. Four values differ.

|                            | USDC                            | SUI                                      |
| -------------------------- | ------------------------------- | ---------------------------------------- |
| `reserve_array_index`      | `7`                             | **`0`**                                  |
| Second type argument (`T`) | `0xdba34672…::usdc::USDC`       | **`0x2::sui::SUI`**                      |
| Decimals                   | 6                               | **9** — amounts are in MIST              |
| Minted position type       | `Coin<CToken<MAIN_POOL, USDC>>` | `Coin<CToken<MAIN_POOL, 0x2::sui::SUI>>` |

**The decimals are the easy mistake.** A supply amount copied from a USDC example in this guide is off by a factor of a thousand against SUI: 25 USDC is `25000000`, while 25 SUI is `25000000000`.

**`0x2::sui::SUI` is legal where a type argument is expected**, including the second `typeArguments` entry, and the node's padded spelling `0x0000…0002::sui::SUI` is the same type and equally accepted. The shorthand is _not_ accepted in a `target` or an `objectId`, which stay strict `0x` + 64 hex — and if you key your own code off the coin type (matching a step against the selected asset, picking a reserve), normalise both spellings before comparing, because a `===` against the wrong one silently matches nothing.

**Re-read the index off the live market.** `reserve_array_index` is a position in the `reserves` vector, not an id, so `0` for SUI holds only as long as Suilend does not reorder it. Passing an index whose `coin_type` disagrees with `T` aborts with `EWrongType` rather than quietly supplying into another reserve, so the failure is safe — but it is a failure.

The "leave something behind" rule bites harder on SUI than on USDC, because SUI is the token you are most likely to want liquid for something else: supplying the intermediary's entire SUI balance leaves it holding none, and the next steps-only execution over SUI — including the redeem that would bring this position back — is refused for want of an action coin. It is not a gas problem (the service sponsors gas and your transaction carries no gas coin), just the action-coin precondition.

### Reading the position afterwards

The position is not derivable from an address the way a Solana token account is — it is made of objects created by whichever transaction happened to mint them, so you look them up on chain against the resolved intermediary from `GET /api/v1/executions/{wallet}/intermediary` → `result.sui`.

A Suilend USDC position is one or more owned objects of type

```
0x2::coin::Coin<0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::reserve::CToken<0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL, 0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC>>
```

Suilend mints a **fresh coin per deposit**, so a position built up over several supplies is spread across several coin objects. Their `balance` fields carry the reserve's decimals but are **not** denominated in the underlying: a cToken is worth more than one unit of the underlying and grows as interest accrues, so label them as cTokens wherever they are displayed.

### Sign and submit

Identical to every other destination. The create response returns `result.details.payload` and `result.details.signingStandard` — the standard is your **origin wallet's** (`erc191` for EVM, `raw_ed25519` for Solana, `nep413` for NEAR, `tip191` for Tron, `sep53` for Stellar, `ton_connect` for TON). Sign that payload and post it:

```
POST /api/v1/executions/{wallet}/submit
{ "signature": "…", "executionId": "…" }
```

An ed25519 origin (Solana, NEAR, Stellar) adds `publicKey`; a TON origin adds both `publicKey` and a `tonConnect` envelope. You never handle the Sui transaction bytes and you never pay SUI for gas — the service sponsors the transaction and recovers the cost through the commission.

Note that a signed Sui transaction is valid for the **current epoch and the next**, roughly one to two days, and is permanently unexecutable after that. Steps-only broadcasts as soon as your signature lands, so it finishes far inside that window; a bridge-in waits for the deposit, and in practice the quote's own `deadline` expires a late bridge-in first. Treat the quote deadline as the deposit deadline you show the user.
