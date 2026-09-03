---
icon: book-open
---

# Sui as destination

This guide explains how to interact with the service when your execution runs on **Sui** — how your account on Sui is addressed, how to describe an on-chain action as a list of steps, and how to sign and submit. It is the conceptual overview: the step format, argument kinds, placeholders and rules below are illustrated with inline snippets and a quick reference.

When an execution targets Sui, the only thing that changes versus any other destination is the **contents of the `steps` array** — each step is one command of a Sui programmable transaction block instead of an EVM call. Everything around it (the request envelope, signing with your origin wallet, and the submit call) is the same as for any destination.

### Your Sui intermediary account

The action does not run from your own wallet. It runs from a dedicated **intermediary account** that the service controls on your behalf. On Sui this is an ed25519 account that is **deterministically derived from your origin wallet** — it is stable for a given origin wallet, but you cannot compute it yourself, so you fetch it from the API.

#### Get your Sui address from your origin wallet

Call the intermediary endpoint with your origin wallet in the path. For an EVM origin, that is your `0x…` address:

```
GET /api/v1/executions/0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5/intermediary
```

```jsonc
{
  "result": {
    "originAccount": "0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5",
    "originType":    "evm",
    "evm":           "0x9c8B7a6F5e4D3c2B1a09F8e7D6c5B4a3928170615",       // your EVM intermediary
    "solana":        "2fjhr2fzcoHYvdKkYpxBsUnE5QDg2hhb2mnxfwrL7RTY",      // your SOLANA intermediary
    "sui":           "0x7b1c0e4a9d3f52886b0c1d7e4a5f9038261c4b7ed05a93f2c8146bd0e37a5f91"  // your SUI intermediary
  }
}
```

Read `result.sui` — that `0x` + 64 hex string is **your** Sui intermediary account. All five keys are always present. The same endpoint works for Solana, NEAR, Stellar and Tron origins too. A TON origin must pass its owner key as a query parameter, `?publicKey=ed25519:<base58>`.

`sui` comes back as `null` both when Sui destinations are not enabled for the deployment **and** when the derivation itself failed — the request still answers `200`, so that one disabled or degraded family never costs the caller the other two. Treat a `null` as "cannot build a Sui execution right now" rather than as a permanent answer about the deployment's capabilities.

You normally do **not** paste this address into your steps. Use the placeholder `{INTERMEDIARY}` wherever the intermediary appears — as a transfer recipient, an owner argument, or anywhere a Move call wants your address — and the service substitutes the real one for you. Fetch the resolved address only when you need to look up objects it owns, or to display it.

#### The action coin — `{ACTION_COIN}`

A Sui balance is not one account you can name. It is a **set of `Coin<T>` objects with unpredictable ids**, or a balance credited under your address, and neither is knowable to a frontend when it builds a request. So there is no token account to derive, the way there is on Solana.

Instead, every Sui execution has exactly one **action coin**: the coin the action spends, in the execution's token. You name it with the `{ACTION_COIN}` sentinel in an argument's `objectId`, and the service resolves it for you:

* If the intermediary owns one or more `Coin<T>` objects of that type, the first is the action coin and the rest are merged into it — up to a deployment cap, 64 objects by default (see **Limits**) — so `{ACTION_COIN}` is the whole balance held as objects for any wallet under that cap.
* If it has a balance credited under its address — which is how a completed bridge-in leaves funds — the service withdraws that balance into a fresh coin and `{ACTION_COIN}` is that coin.
* If both exist, both are used: the credited balance is withdrawn first and the coin objects are merged into it. A stray dust coin can never displace a credited balance.
* On a bridge-in, `{ACTION_COIN}` is the coin the bridge is going to deliver — it does not exist yet when you sign, and that is fine.

`{ACTION_COIN}` is valid only as an `objectId` — a pure value carrying it does not count and will not satisfy the requirement below — and it is the one sentinel that is **not** substituted into text: it is bound to a programmable-transaction argument when the transaction is assembled, which is exactly why it works on a bridge-in. Naming it in several steps is free: every mention binds to the same argument and allocates no extra transaction input — the same way any repeated object id does.

Which token it is depends on the flow: the **destination** token on a bridge-in or a steps-only execution, the **origin** token on an out-operation. The two tokens 1CLICK lists on Sui today:

| Token        | Decimals | Move coin type                                                                   |
| ------------ | -------- | -------------------------------------------------------------------------------- |
| SUI (native) | 9        | `0x2::sui::SUI`                                                                  |
| USDC         | 6        | `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC` |

Amounts everywhere are in the coin's atomic units: 1 SUI = `1000000000`, 25 USDC = `25000000`.

The `destinationAsset` and `quote` fields want an **asset id**, never a Move coin type — the service resolves the id against its own token list and derives the coin type itself. List the ids from `GET /api/v1/supported_tokens`, and mind which side Sui appears on: with `?flow=inOperation` (or no flow at all) Sui tokens are in `result.out`, since Sui is a bridge destination and never a bridge source. With `?flow=outOperation` they are in `result.in` instead. Native SUI is listed with an **empty** `contractAddress`, which means the native coin rather than an unknown token.

The habit to unlearn from Solana is looking in `in`. Solana destination tokens are in `out` as well — but because Solana is also a bridge _source_, its tokens appear in `in` too, and reading them from there works. Sui is deliberately never a source, so its tokens are only ever in the settleable list.

This listing is not a capability check. It is a pass-through of the upstream token catalogue filtered by chain, and it never consults whether the deployment has Sui destinations enabled — that is decided on the create paths. The probe for "can I build a Sui execution here" is the intermediary endpoint returning a non-null `sui`.

### The three ways to reach a Sui action

| Mode              | Endpoint                                                    | Envelope                                | When                                                                     |
| ----------------- | ----------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| **Steps-only**    | `POST /api/v1/executions/{wallet}/steps`                    | no `quote`                              | the intermediary already holds the token. You just act on it             |
| **Bridge-in**     | `POST /api/v1/executions/{wallet}`                          | carries a `quote`, requires `x-api-key` | bridge a token in from another chain and act on it in one signed request |
| **Out-operation** | `POST /api/v1/executions/{wallet}` + `"outOperation": true` | carries a `quote`, requires `x-api-key` | the action runs on Sui and its output is bridged out to another chain    |

The Sui step shape applies whenever the action chain is Sui. On `POST /api/v1/executions/{wallet}` an explicit `type` must agree with the action chain — the **destination** chain for a bridge-in, the **origin** chain for an out-operation. `type: "sui"` against a non-Sui asset is `400` (`type=sui requires a Sui destinationAsset, got blockchain "base"`), and so is `type: "evm"` against a Sui one (`type=evm cannot target a Sui destinationAsset. Set type=sui`). On an out-operation both messages name the `originAsset` instead, because that is the action chain there — `type=sui out-operation requires a Sui originAsset, got blockchain "base"`.

**Always send `"type": "sui"` explicitly.** The field may be omitted — the service infers the family from the action chain and routes correctly — but an omitted `type` is recorded as the literal `"evm"`, and every create and list response for that execution will then report `"type": "evm"` back to you.

Sui is a destination only. It can be the chain an out-operation _starts_ on, but it is never the far side of a bridge — a `sui` to `sui` pair is `400` (`outOperation from a Sui origin to a Sui destination is not supported`).

### The step format

**One step is one PTB command.** Unlike EVM (where a step is a call) or Solana (where a step is an instruction), a Sui step is one of five programmable transaction commands, and arguments carry their values inline:

```jsonc
{
  "command":       "moveCall",                // moveCall | splitCoins | mergeCoins | transferObjects | makeMoveVec
  "target":        "0xpkg…::module::function",// moveCall only, full 64-hex package id
  "typeArguments": ["0x2::sui::SUI"],         // moveCall: up to 16. makeMoveVec: at most one
  "arguments":     [ /* SuiArg */ ],          // moveCall args / transferObjects objects / makeMoveVec elements
  "coin":          { /* SuiArg */ },          // splitCoins, mergeCoins: the primary coin
  "amounts":       [ /* SuiArg */ ],          // splitCoins
  "sources":       [ /* SuiArg */ ],          // mergeCoins
  "recipient":     { /* SuiArg */ },          // transferObjects
  "metadata":      { "name": "…", "description": "…" }  // OPTIONAL, free-form, never interpreted
}
```

Each command reads only its own fields, and a step carrying a field its command does not read is rejected rather than having it silently ignored — `step 0: the splitCoins command does not take a "target" field`:

| `command`         | Fields it reads                             | Required                                                                                |
| ----------------- | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| `moveCall`        | `target`, `typeArguments`, `arguments`      | `target`                                                                                |
| `splitCoins`      | `coin`, `amounts`                           | `coin`, and at least one amount                                                         |
| `mergeCoins`      | `coin` (the destination), `sources`         | `coin`, and at least one source                                                         |
| `transferObjects` | `arguments` (the objects), `recipient`      | at least one object, and `recipient`                                                    |
| `makeMoveVec`     | `typeArguments`, `arguments` (the elements) | at least one element, **or** exactly one `typeArguments` entry when the vector is empty |

#### The commands, one by one

Five commands, and no others. `command` is matched **exactly** — `MoveCall` is `step 0: unknown sui command "MoveCall" (expected one of: moveCall, splitCoins, mergeCoins, transferObjects, makeMoveVec)`. There is deliberately no `publish` and no `upgrade`.

Read each section for three things: the fields the command reads, **what it does to its arguments** — moves them, borrows them, or neither, which is what the sink rule turns on — and **what it leaves behind** for a later step to pick up.

**`moveCall` — call a Move function**

| Field           |                                                        |
| --------------- | ------------------------------------------------------ |
| `target`        | **required.** `package::module::function`              |
| `typeArguments` | optional. The call's generic type parameters, in order |
| `arguments`     | optional. The call's value parameters, in order        |

**`target`.** The package must be a **full** `0x` + 64 lowercase hex address. The `0x2` shorthand is not accepted here — only in type arguments — so `0x2::pay::split_and_transfer` must be written `0x0000000000000000000000000000000000000000000000000000000000000002::pay::split_and_transfer`. Module and function are Move identifiers: `[A-Za-z_][A-Za-z0-9_]*`, at most 128 bytes each. The rejection names which part is wrong: a segment count other than three is `invalid moveCall target "…": expected package::module::function`, a short or non-hex package is `invalid moveCall target "…": invalid Sui address "0x2": expected 64 hex digits, got 1`, and a bad identifier is `invalid moveCall target "…" module: invalid move identifier "…"` (or `… function: …`). Two well-formed targets are refused as well: `0x2::coin::redeem_funds` and anything in `0x2::funds_accumulator` (`moveCall target "…" is a backend-only accumulator withdrawal entry point`), and any package at the service's sponsor or fee address (`step N target references reserved backend address 0x…`).

**`typeArguments`** are Move type tags: a primitive (`bool`, `u8`…`u256`, `address`, `signer`), a `vector<T>`, or a struct `address::module::Name` with optional `<T, …>` parameters. Here the shorthand **is** accepted, so `0x2::sui::SUI` and `0x2::coin::Coin<0x2::sui::SUI>` are both fine. Note that `id` and `string` are pure-argument type names, not type tags — as type arguments write `0x2::object::ID` and `0x1::string::String`. At most 16 per call, each at most 4096 bytes and nested at most 16 deep.

**`arguments` must omit runtime-supplied parameters.** A Move function taking `&mut TxContext` (or `&TxContext`) as its last parameter receives it from the runtime, so send no argument for it. Line argument _i_ up with parameter _i_ after dropping that trailing one.

**What it does to its arguments** is whatever the function's signature says, and that is not visible from the payload: a `Coin<T>` parameter **moves** the coin, a `&mut Coin<T>` or `&Coin<T>` only borrows it. This is the one command whose consumption behaviour you have to look up — see **Reading chain state before you build steps**.

**What it leaves behind** is the function's return list. A function returning nothing leaves nothing. A function returning exactly one value is reached with `result`. A function returning a tuple is reached with `nestedResult`, one index per position. An `entry` function that transfers its own output — `request_add_stake`, `request_withdraw_stake` — returns nothing to consume even though it clearly produced something.

A worked call with every argument kind in play. Suilend's redeem burns a cToken coin and hands back the underlying; its `Option<RateLimiterExemption<P, T>>` parameter cannot be expressed as a pure argument, so step 0 produces the `None` and step 1 wires it in:

```jsonc
"steps": [
  {
    "metadata": { "name": "option::none", "description": "No rate-limiter exemption" },
    "command": "moveCall",
    // 0x1 in FULL form: a target package is strict even for the standard library
    "target": "0x0000000000000000000000000000000000000000000000000000000000000001::option::none",
    // ...while a TYPE argument may use the 0x-shorthand, and must carry the
    // ORIGINAL publish address of the package that defined the type
    "typeArguments": [
      "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::RateLimiterExemption<0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL, 0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC>"
    ]
    // no `arguments` at all: option::none<T>() takes none
  },
  {
    "metadata": { "name": "redeem", "description": "Burn cTokens, withdraw USDC" },
    "command": "moveCall",
    // the LATEST published package, because LendingMarket asserts its own version
    "target": "0x4989dd9a04581ee50d0d0b3dd99b56c1a86bc363b57dc5b64264832c97e72645::lending_market::redeem_ctokens_and_withdraw_liquidity",
    "typeArguments": [
      "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL",
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
    ],
    "arguments": [
      { "kind": "object", "objectId": "0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1",
        "shared": true, "mutable": true },                        // the lending market, by &mut
      { "kind": "pure",   "type": "u64", "value": "7" },          // reserve_array_index for USDC
      { "kind": "object", "objectId": "0x0000000000000000000000000000000000000000000000000000000000000006",
        "shared": true },                                         // the Clock, by & — no "mutable"
      { "kind": "object", "objectId": "<your cToken coin object id>" },  // owned, taken by value
      { "kind": "result", "command": 0 }                          // the None from step 0
      // no argument for the trailing &mut TxContext
    ]
  }
]
```

`redeem_ctokens_and_withdraw_liquidity` returns a single `Coin<T>`, so a later step consumes it with `{ "kind": "result", "command": 1 }` — not `nestedResult`.

**`splitCoins` — take amounts out of a coin**

| Field     |                                                            |
| --------- | ---------------------------------------------------------- |
| `coin`    | **required.** The coin to split. One argument, not a list  |
| `amounts` | **required, at least one.** Each a `u64` worth of the coin |

Omitting either is `step 0: splitCoins requires a coin` / `step 0: splitCoins requires at least one amount`.

**What it does to its arguments:** it **borrows** `coin` by `&mut` and does not consume it. This is the single most common source of a failed Sui execution: a `splitCoins` on `{ACTION_COIN}` leaves the action coin live and still needing a sink.

**What it leaves behind** is always a **tuple** — one fresh coin per entry in `amounts`, in the same order — so its outputs are reached with `nestedResult`, never with `result`. `index: 0` is the coin cut by `amounts[0]`, `index: 1` by `amounts[1]`, and so on. Every one of them is a `Coin<T>`, which has no `drop` ability, so **every** split output must be consumed by something.

```jsonc
{
  "command": "splitCoins",
  "coin":    { "kind": "object", "objectId": "{ACTION_COIN}" },
  "amounts": [
    { "kind": "pure", "type": "u64", "value": "25000000" },   // -> nestedResult index 0
    { "kind": "pure", "type": "u64", "value": "5000000" }     // -> nestedResult index 1
  ]
}
```

Splitting the coin's entire value is a trap rather than a shortcut: it produces the whole coin plus a live **zero-value remainder**, and both still need consuming. When you mean "all of it", pass `{ACTION_COIN}` by value instead of splitting.

**`mergeCoins` — fold coins into one**

| Field     |                                                                         |
| --------- | ----------------------------------------------------------------------- |
| `coin`    | **required.** The destination — the coin everything else is folded into |
| `sources` | **required, at least one.** The coins to fold in                        |

Omitting either is `step 0: mergeCoins requires a coin` / `step 0: mergeCoins requires at least one source`.

**What it does to its arguments:** the destination is **borrowed** by `&mut` and survives; every source is **moved** and is gone afterwards. So a `mergeCoins` naming the action coin among its `sources` sinks it; one naming it as the destination does not. Naming the action coin on both sides is a self-merge, which always aborts.

**What it leaves behind:** nothing.

This is also the one command whose funding effect the service can read off the wire, and it is where the commission lands — see **Fees**.

**`transferObjects` — send objects to an address**

| Field       |                                                 |
| ----------- | ----------------------------------------------- |
| `arguments` | **required, at least one.** The objects to send |
| `recipient` | **required.** One argument, an address          |

Omitting either is `step 0: transferObjects requires at least one object` / `step 0: transferObjects requires a recipient`.

**What it does to its arguments:** every object in `arguments` is **moved**. This is the universal sink, and it takes as many objects as you like in one command, which is why the idiomatic last step consumes the action coin and everything the earlier steps returned together:

```jsonc
{
  "command":   "transferObjects",
  "arguments": [
    { "kind": "result", "command": 1 },                    // the coin the redeem returned
    { "kind": "object", "objectId": "{ACTION_COIN}" }      // and the action coin itself
  ],
  "recipient": { "kind": "pure", "type": "address", "value": "{INTERMEDIARY}" }
}
```

`recipient` is normally a pure `address`, and `{INTERMEDIARY}` or `{DEPOSIT_ADDRESS}` substitute straight into it.

**What it leaves behind:** nothing.

**`makeMoveVec` — build a `vector<T>` argument**

| Field           |                                |
| --------------- | ------------------------------ |
| `arguments`     | the elements, in order         |
| `typeArguments` | at most one — the element type |

At least one element, **or** exactly one `typeArguments` entry when the vector is empty: an empty vector carries no element to infer the type from, so `step 0: an empty makeMoveVec requires exactly one type argument`. More than one type argument is `step 0: makeMoveVec takes at most one type argument, got 2`.

**What it does to its arguments:** every element is **moved**.

**What it leaves behind** is a single `vector<T>` value, reached with `result`. Be careful here: for a `T` without `drop` — `Coin<T>` is the case you will hit — the vector itself has no `drop` either, so a `makeMoveVec` whose output nobody reads aborts the transaction with `UnusedValueWithoutDrop`, **and takes the coins inside it down with it**. A `makeMoveVec` is a way to pass a vector to a `moveCall`, not a way to sink coins.

#### The four argument kinds

Every argument is one of four kinds, and each kind reads a different set of fields. An argument carrying another kind's fields is rejected outright rather than having the extra field ignored — `step 1 argument 0: object argument carries fields of another argument kind` — and an unknown or empty `kind` is `step 1 argument 0: unknown sui argument kind "gasCoin" (expected one of: pure, object, result, nestedResult)`.

That rejection has one blind spot. The check compares each foreign field against its **empty value** rather than asking whether the key was sent. So a `pure` or `object` argument carrying `"command": 0` or `"index": 0`, a `"shared": false` or `"mutable": false` on a `pure`, an `"objectId": ""` on a `pure` or a `"type": ""` on an `object` is accepted, with the field ignored; any non-empty value is rejected. Send none of them.

```jsonc
{ "kind": "pure",         "type": "u64", "value": "25000000" }          // a BCS-encoded value
{ "kind": "object",       "objectId": "0x…" }                           // an object the intermediary owns
{ "kind": "object",       "objectId": "0x…", "shared": true, "mutable": true }  // a shared object
{ "kind": "object",       "objectId": "{ACTION_COIN}" }                 // the action coin
{ "kind": "result",       "command": 0 }                                // the whole return of step 0
{ "kind": "nestedResult", "command": 0, "index": 0 }                    // one position of step 0's return tuple
```

There is no `gasCoin` kind, and there never will be — the gas the service pays is not addressable from a step. There is also no way to name a transaction **input** by index: the service owns the input list, which is why every value you want to pass has to arrive as one of the four kinds above.

And there is no `receiving` kind. `ObjectArg::Receiving` — the form Sui's own `transfer::receive` family takes — has no step spelling at all: an `objectId` becomes either an owned or a shared input and nothing else. A Move function with a `Receiving<T>` parameter therefore cannot be called through this API.

**`pure` — a value**

Fields: `type` and `value`, both required (`step 0 argument 0: pure argument requires a type` / `… requires a value`).

At the PTB level a pure argument becomes its own **input**, carrying the BCS encoding of `value` under the layout `type` declares. Pure inputs are **not** deduplicated: two arguments with the same type and value cost two inputs. See **Pure argument types** below for the closed type set and the encoding rules.

Use it for anything that is not an object and not another command's output: amounts, addresses, indices, flags, byte vectors.

**`object` — an object, by id**

Fields: `objectId` (required), and for a shared object `shared` and `mutable`.

You name only the **id**. You never send a version or a digest: the service reads them at build time, because a version pinned when you built the request would already be stale by the time the transaction is broadcast. Object ids are strict — exactly `0x` + 64 lowercase hex, with no left-padding and no short form.

* **Owned object** — just `objectId`. The service looks up its live version and digest against the resolved intermediary, so it has to be an object the intermediary actually holds. A **bridge-in may not name an owned object at all**.
* **Shared object** — add `"shared": true`. The service supplies the object's initial shared version. Add `"mutable": true` when the Move parameter takes it by `&mut`, and leave it out when the parameter is `&`. Setting `mutable` without `shared` is `step 0 argument 0: mutable is only meaningful for a shared object`, and because the field is a boolean there is no way to encode the protocol's forbidden non-exclusive-write mutability at all.
* **`{ACTION_COIN}`** — the coin the action spends. See its own section above.

**Object inputs are deduplicated by id, and pure inputs are not.** Naming the same object in five commands allocates **one** input, which is not just an optimisation: the protocol rejects a transaction that lists the same object id twice, so two commands sharing the `Clock` would otherwise be unencodable. What you must not do is name one id **inconsistently** — once as shared and once as owned is `object 0x… is used both as a shared and as an owned object`. Mutability, by contrast, is merged rather than rejected: if any occurrence asks for `&mut`, the single input is mutable for all of them.

**`result` — everything an earlier command returned**

Fields: `command`, and nothing else. Passing a **non-zero** `index` is `step 2 argument 0: result takes no index, use nestedResult`; an explicit `"index": 0` is accepted and ignored. Omitting `command` is not an error either — it reads as `0`, which is step 0. See **Zero is the default** below.

At the PTB level this is `Argument::Result(i)` — the **whole** return value of command _i_. Use it when the command returns exactly one value, which is the common case for a `moveCall`. Used on a command that returned a tuple it names the tuple itself, which will not type-check as whatever the receiving parameter wanted.

**`nestedResult` — one position of an earlier command's return tuple**

Fields: `command` and `index`, each of which reads as `0` when omitted — see **Zero is the default** below.

At the PTB level this is `Argument::NestedResult(i, j)` — position _j_ of command _i_'s return. Use it for `splitCoins`, which **always** returns a tuple even with a single amount, and for any `moveCall` returning more than one value.

`index` is bounded to `0…65535` (`nestedResult index 70000 out of range`) and **that is the only check on it**. Nothing at create time knows how many values the producing command returns, so an index past the end of the tuple is not a field error — it surfaces from the simulation as an abort naming the command.

#### Wiring steps together: `result` and `nestedResult`

Sui steps are not independent instructions. They are a pipeline, and `result` / `nestedResult` are the only wires: one command's output becomes the next command's argument, with no intermediate object id and no separate transaction.

**`command` is an index into your own `steps` array**, zero-based, exactly as you sent it. You never see or compute the absolute PTB index — the service prepends commands of its own and remaps every reference for you.

**References point strictly backwards.** `command` must be at least `0` and strictly less than the step it appears in: `step 2 argument 0: references step 3, which is not an earlier step`. You cannot reference a later step, you cannot reference the step you are in, and you cannot reference anything the service prepends — the only handle for the service's own work is `{ACTION_COIN}`.

**Zero is the default for `command` and `index`.** Neither key is required on the wire: a missing `command` reads as step `0`, a missing `index` as position `0`. So `{"kind": "result"}` and `{"kind": "result", "command": 0}` are the same argument, and so are `{"kind": "nestedResult"}` and `{"kind": "nestedResult", "command": 0, "index": 0}`. Two things follow:

* **Send both keys anyway.** A `command` you drop by accident does not fail validation — it silently references step 0, which is a real step in any array of more than one. It is the one place in the Sui step shape where a missing field is not caught.
* **The echo drops them again.** A zero `command` or `index` is omitted from the steps echoed back on a real create, so a reference to step 0's first return value comes back as `{"kind": "nestedResult"}` with neither key present. Read a missing key as `0` when you parse the echo, or a round trip through your own UI will re-send a different argument than the one that was signed.

**Which one to use is decided by the producing command**, not by what you want out:

| Producing command               | Reach its output with                                                         |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `splitCoins`                    | `nestedResult`, always — `index: n` is the coin cut by `amounts[n]`           |
| `moveCall` returning one value  | `result`                                                                      |
| `moveCall` returning a tuple    | `nestedResult`, one index per position                                        |
| `moveCall` returning nothing    | nothing to reach — including `entry` functions that transfer their own output |
| `makeMoveVec`                   | `result` — the vector is a single value                                       |
| `mergeCoins`, `transferObjects` | nothing to reach                                                              |

Only three things about a reference are checked before anything is built: that `command` is strictly earlier, that a `result` carries no non-zero `index` (`step 1 argument 0: result takes no index, use nestedResult`), and that a `nestedResult` `index` fits in `0…65535`. **Nothing checks arity.** The service does not know how many values a command returns, so `result` on a `splitCoins`, a `nestedResult` index past the end of a real tuple, and a reference to a command that returns nothing all pass validation identically and reach Sui's own type checker. That happens at create on every flow, because the fee probe simulates your steps before anything is signed — coming back as `sui transaction simulation reverted: fee probe aborted at command N: …`, or as `… command N aborted: …` when it is the second, pre-sign simulation that catches it. N there is an absolute command index, not your step number.

A three-step wire, each step consuming the one before:

```jsonc
"steps": [
  {                                                  // step 0 -> a tuple of one coin
    "command": "splitCoins",
    "coin":    { "kind": "object", "objectId": "{ACTION_COIN}" },
    "amounts": [ { "kind": "pure", "type": "u64", "value": "2000000000" } ]
  },
  {                                                  // step 1 -> one Coin<CToken<…>>
    "command": "moveCall",
    "target":  "0x4989dd9a…::lending_market::deposit_liquidity_and_mint_ctokens",
    "typeArguments": [ "0xf95b0614…::suilend::MAIN_POOL", "0x2::sui::SUI" ],
    "arguments": [
      { "kind": "object", "objectId": "0x84030d26…", "shared": true, "mutable": true },
      { "kind": "pure",   "type": "u64", "value": "0" },
      { "kind": "object", "objectId": "0x0000…0006", "shared": true },
      { "kind": "nestedResult", "command": 0, "index": 0 }   // <- the split coin, position 0
    ]
  },
  {                                                  // step 2 consumes step 1's single return
    "command":   "transferObjects",
    "arguments": [
      { "kind": "result", "command": 1 },                    // <- the minted cToken coin
      { "kind": "object", "objectId": "{ACTION_COIN}" }      // <- and the borrowed action coin
    ],
    "recipient": { "kind": "pure", "type": "address", "value": "{INTERMEDIARY}" }
  }
]
```

Two failure modes are worth naming, because neither is a validation error and both abort the whole transaction:

* **A result nobody reads.** Sui aborts on a value left live at the end of the transaction unless its type has `drop`. `Coin<T>` does not, and neither does a `vector<Coin<T>>`, so a dangling coin or a dangling `makeMoveVec` is `UnusedValueWithoutDrop`. Every coin your steps produce — split outputs, minted receipts, redeemed proceeds — must end up moved somewhere, and a `transferObjects` to `{INTERMEDIARY}` is the cheap way to do it. Being read by a command that only **borrows** it does not count; it has to be moved.
* **A value used after it is moved.** Once a command takes a value by value, that value is gone: naming it again is `InvalidValueUsage`. So the sink for the action coin has to be the **last** thing that names it, and a `transferObjects` of `{ACTION_COIN}` appended after a `moveCall` that already consumed the coin by value is an abort, not a safety net.

#### Pure argument types

Pure arguments are BCS-encoded from a declared type and a JSON value. The type set is closed — anything else is `unknown pure argument type "…"`:

| `type`                               | Value form                                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `bool`                               | `true` / `false`                                                                                                  |
| `u8` `u16` `u32` `u64` `u128` `u256` | a number, or a quoted decimal string (prefer quoted for `u64` and wider)                                          |
| `address`                            | `0x` + 64 lowercase hex, or a sentinel that resolves to one                                                       |
| `id`                                 | the same 32-byte form as `address`                                                                                |
| `string`                             | a UTF-8 string                                                                                                    |
| `vector<T>`                          | a JSON array of `T` values. Nests, so `vector<vector<u8>>` is an array of arrays                                  |
| `option<T>`                          | `null` for none, otherwise the `T` value directly                                                                 |
| `raw`                                | a hex string **without** `0x`, of pre-encoded BCS bytes. **Top level only** — never inside a `vector` or `option` |

Encoding is strict: an over-width integer (`value 256 exceeds u8 max 255`) or a negative value for an unsigned type is rejected rather than silently wrapped, a `vector` whose value is not a JSON array is rejected, a float or an exponent form is rejected, and one encoded argument may not exceed **16383** bytes — the node's own gate is strict, so the round 16384 is itself refused. Container types nest at most 16 deep.

**A byte vector is an array of numbers, not a hex string.** `vector<u8>` takes `[1, 2, 255]`. This is the most common encoding mistake on Sui: `0x`-hex is only for `address` and `id`, and bare hex with no `0x` is only for `type: "raw"`.

`raw` is for a **primitive-layout** value you would rather encode yourself — it still produces a pure input, and Sui's adapter accepts a pure input only when its layout is primitive. So `raw` does **not** rescue a struct, and the two ways of trying fail at different points:

* A declared `option<0x…::module::Struct>` is rejected when the steps are encoded, because the type set has no struct branch at all — a `400` reading `sui steps cannot be encoded into a programmable transaction: step N: argument M: unknown pure argument type "…"`. The type set is enforced by the encoder, not by the field validator, so this is the last `400` to fire — on a bridge-in, after the quote.
* A hand-encoded `"raw"` value carrying the same bytes (`00` for a `None`) passes validation, since `raw` bytes are taken as given. It is Sui's own adapter that refuses it, so you get a simulation revert naming the command rather than a message about the argument.

**When a Move function needs a value this set cannot express — a struct by value, a `None` of a struct option — get it from an earlier `moveCall` and wire it in with `result`.** A call that _returns_ the value is accepted where a pure argument is not. The worked case is Suilend's redeem, whose `Option<RateLimiterExemption<P, T>>` parameter is satisfied by prepending an `option::none` call with the exemption as its type argument and passing its result.

#### Placeholders

| Sentinel            | Resolves to                                                        | Bridge-in    | Out-op               | Steps-only   |
| ------------------- | ------------------------------------------------------------------ | ------------ | -------------------- | ------------ |
| `{ACTION_COIN}`     | the coin the action spends (`objectId` only)                       | **required** | required in practice | **required** |
| `{INTERMEDIARY}`    | your MPC-derived Sui account                                       | yes          | yes                  | yes          |
| `{MIN_AMOUNT_OUT}`  | the post-fee bridged amount, as a `u64`                            | yes          | `400`                | `400`        |
| `{DEPOSIT_ADDRESS}` | the deposit address the output is bridged from, as an `address`    | `400`        | yes                  | `400`        |
| `{AMOUNT_IN}`       | the origin commitment (`quote.amountIn` + network fee), as a `u64` | `400`        | `EXACT_OUTPUT` only  | `400`        |

Substitution reaches an argument's `objectId` and its pure `value`, including values nested inside a `vector<…>` array literal. It never touches `target`, `typeArguments` or `metadata`, and strings inside a JSON object are not visited. Sending a sentinel where it is not valid is a `400` naming the sentinel, not a silent pass-through, and an unrecognised `{…}` in an `objectId` is rejected as `step N argument M: unknown placeholder "{FOO}" in objectId (expected one of: {ACTION_COIN}, {INTERMEDIARY}, {DEPOSIT_ADDRESS})`. The one exception is a pure `string`: `{ACTION_COIN}` inside a `type: "string"` value is not a placeholder position, so it is encoded as the literal text and passes — which is also why it does not count towards the action-coin requirement.

Because the replacement is spliced in as a JSON string, a `u64` argument may carry one directly: `{"kind": "pure", "type": "u64", "value": "{MIN_AMOUNT_OUT}"}` becomes a quoted decimal, which `u64` accepts.

**Do not use `{MIN_AMOUNT_OUT}` to carve the action coin.** By the time your first step runs the commission has already been split off, so `{ACTION_COIN}` is worth exactly `{MIN_AMOUNT_OUT}` — splitting that amount off it produces the whole coin plus a live zero-value remainder, which is the abort described under **Sink the action coin**. Use the sentinel for a Move call's own amount operand, such as a swap's slippage floor, and pass `{ACTION_COIN}` by value when you mean "all of it".

### Two worked shapes

**Send part of the action coin to someone, and keep the rest.** Three steps: split, pay, then sink the remainder.

```jsonc
"steps": [
  {
    "metadata": { "name": "Split", "description": "Take 25 USDC out of the action coin" },
    "command": "splitCoins",
    "coin":    { "kind": "object", "objectId": "{ACTION_COIN}" },
    "amounts": [ { "kind": "pure", "type": "u64", "value": "25000000" } ]   // 25 USDC (6 decimals)
  },
  {
    "metadata": { "name": "Pay", "description": "Send it to the recipient" },
    "command":   "transferObjects",
    "arguments": [ { "kind": "nestedResult", "command": 0, "index": 0 } ],  // the coin split above
    "recipient": { "kind": "pure", "type": "address",
                   "value": "0x4f2a91c7d05b3e6841a7c92fb0d5e33814c6a7095b2ed418f7c30a6b95d1e274" }
  },
  {
    "metadata": { "name": "Keep the change", "description": "Return the remainder to the intermediary" },
    "command":   "transferObjects",
    "arguments": [ { "kind": "object", "objectId": "{ACTION_COIN}" } ],
    "recipient": { "kind": "pure", "type": "address", "value": "{INTERMEDIARY}" }
  }
]
```

The third step is not bookkeeping you can skip — see **Sink the action coin** below.

**Spend the whole action coin in a Move call.** Staking bridged SUI with a validator, which takes the coin by value:

```jsonc
"steps": [
  {
    "command": "moveCall",
    "target":  "0x0000000000000000000000000000000000000000000000000000000000000003::sui_system::request_add_stake",
    "arguments": [
      { "kind": "object", "objectId": "0x0000000000000000000000000000000000000000000000000000000000000005",
        "shared": true, "mutable": true },                                 // the system state object
      { "kind": "object", "objectId": "{ACTION_COIN}" },                   // taken by value
      { "kind": "pure",   "type": "address", "value": "<validator address>" }
      // no argument for the trailing &mut TxContext
    ]
  }
]
```

Because the call takes the coin **by value**, it consumes the action coin and no sink step is needed. Note the `0x3` and `0x5` written out in full — a `target` package and an `objectId` are both strict. If a Move call instead hands you an object back, add a `transferObjects` sending `{ "kind": "result", "command": 0 }` to `{INTERMEDIARY}`: anything a command returns must be consumed too.

### Rules to follow

* **Name the action coin.** At least one argument must be `{ "kind": "object", "objectId": "{ACTION_COIN}" }`, in any step and any role. Without it a bridge-in or steps-only create is `400` (`steps must include at least one argument referencing the action coin <coinType> via {ACTION_COIN}`).
*   **Sink the action coin, and sink it last.** Something must consume it **by value**. Exactly four things do: a `transferObjects` that moves it, a `mergeCoins` that lists it as a **source**, a `makeMoveVec` element, and a `moveCall` parameter declared by value (`Coin<T>`, not `&Coin<T>` or `&mut Coin<T>`). A `splitCoins` **borrows** its coin and does not consume it, and neither does a `mergeCoins` that names it as the destination. The same applies to anything your own steps return.

    Two qualifications. `makeMoveVec` counts only if something then reads the vector: it does move its elements, but a `vector<Coin<T>>` has no `drop` either, so a vector nobody consumes aborts with `UnusedValueWithoutDrop` and takes the coins inside it down with the transaction. And the command that consumes the action coin has to be the **last** one that mentions it — a moved PTB value cannot be named again, so a sink followed by any further reference is `InvalidValueUsage` rather than a satisfied sink rule. That bites hardest where the move is a `moveCall` `Coin<T>` parameter, because appending the trailing `transferObjects` every other shape ends with is exactly the wrong fix there.

    The reason: when the action coin comes from a credited balance rather than from coin objects — the case for **every bridge-in**, and for any execution over funds a previous bridge-in delivered — it is a command result, and Sui aborts a transaction that ends with a `Coin<T>` result nobody consumed. Which source your execution gets is decided at build time from what the intermediary happens to hold, and after any bridge-in the credited balance is the normal case, so write steps that are correct either way. The universal fix is to end the array with a `transferObjects` of `{ACTION_COIN}` to `{INTERMEDIARY}`, exactly as in the first worked shape above — free under a credited balance, and a harmless self-transfer otherwise.
*   **The intermediary must actually hold the coin.** On a steps-only or out-operation execution the intermediary must hold the token as coin objects, as a credited balance, or both, or the create is `400`. The two flows reach that `400` through different checks and report it differently, so do not match on one string: steps-only says `the intermediary holds no <coinType>: neither a coin object nor an accumulator balance`, while an out-operation fails later, when the action coin is resolved, with `intermediary holds no sui action coin: no <coinType> coin object and no accumulator balance`. There is also a cap on how many coin objects of that type the service will fold into one action coin; past it the create is refused rather than spending only some of them — `intermediary holds too many sui action coin objects: 0x… holds more than <N> <coinType> objects and no accumulator balance`. The cap is a deployment setting rather than a protocol constant — **64** by default, and never above 511 — so read `<N>` out of the message rather than hard-coding it, and split the work across executions when you hit it. The refusal only applies when there is no credited balance to draw on instead, and a bridge-in is exempt from all of this, since the coin it acts on has not arrived yet.

    Holding _some_ is not always enough — but which way it bites depends on where the commission lands. An execution whose funds only arrive mid-array, a position being unwound for instance, needs either the network fee already liquid **or** a `mergeCoins` that folds the proceeds into `{ACTION_COIN}`, which moves the carve to just after that merge (see **Fees**). Without one of the two, a zero balance is caught cleanly by the message above and a balance between zero and the fee aborts the carve instead.
* **Never name the sponsor.** No step may reference the service's sponsor address or its fee address — not as a `moveCall` target package, not as an `objectId`, and not inside a pure value, including as raw bytes inside a `"raw"` argument.
* **Do not add a gas payment, a fee transfer, or a budget.** The service pays gas from its own credited SUI balance, sets the gas price and budget, and appends its own commission commands. There is no compute-budget instruction to add and no gas argument to pass.
* **Do not call the backend's own entry points.** `0x2::coin::redeem_funds` and everything in `0x2::funds_accumulator` are reserved — they are how the service materialises the action coin — and a step targeting either is `400`.
* **A bridge-in may not name an owned object.** Its bytes are signed before the deposit lands and carry no object version that can be refreshed afterwards, so an owned object's version would go stale before they are broadcast (`a pre-signed sui execution may not reference an owned object`). Shared objects are fine, because they are pinned by their initial version, and so is `{ACTION_COIN}`.
* **Reference results backwards only**, and never a later step or a service command.
* **At most 50 steps**, and a request body of at most 256 KB, both deployment defaults rather than protocol constants. The assembled transaction must also fit the protocol bounds: 1024 commands, 2048 inputs, 512 arguments per command, and **130871** serialized bytes — the protocol's 131072 less the 201-byte signed envelope the node actually measures. The argument count includes each command's singular operand, so a `transferObjects` takes at most 511 objects, a `splitCoins` at most 511 amounts and a `mergeCoins` at most 511 sources; `moveCall` arguments and `makeMoveVec` elements count one for one.
* **Never merge the action coin into itself.** A `mergeCoins` naming `{ACTION_COIN}` as both its `coin` and one of its `sources` takes by value a coin the same command has already borrowed mutably, which the executor rejects with `InvalidValueUsage`. The fee probe runs before anything else looks at the merge, so the create fails as `400 sui transaction simulation reverted: fee probe aborted at command N: …` on every flow. The service also does not read a self-merge as funding, so it never moves the commission split.
* **Only the documented step fields.** A key from another step shape (`programId`, `functionSignature`), a differently cased spelling (`Command`, `objectID`), the same key twice in one object, or any field not listed above is `400` (`invalid sui steps JSON: invalid step keys: …`). Anything else you need to carry belongs in `metadata`, which is passed through untouched. Step payloads nested more than 15 containers deep are rejected too, counting the `steps` array itself as the first level, and `metadata` is exempt.
* **`addressLookupTables` is rejected**, not ignored — `400` (`addressLookupTables is not supported for Sui executions`). Sui has no lookup tables, and silently dropping the field would mean signing something other than what was asked for.
* **One live Sui execution per wallet at a time.** This is stricter than the other families: any non-terminal Sui execution for your intermediary blocks the next one, whichever side Sui is on, so two Sui out-operations to _different_ chains collide where the EVM rule would allow both. A second create is `409`.

The service validates steps **before** anything is signed, so mistakes surface as a descriptive `400` rather than a late on-chain failure. It also **simulates your steps on every flow, bridge-in included**, and a step that would revert is a `400` at create rather than a failure on chain.

Two limits on that safety net are worth knowing, because they are the gap a missing sink falls through. First, not every rule above is a create-time validator: the sink requirement in particular is only ever caught by simulation, never by a field check. Second, the two simulations behave differently. On a steps-only or out-operation create the assembled transaction is simulated with checks enabled and a definitive revert is a `400` — but that call **fails open** on a transport error, proceeding with a logged warning rather than refusing. On a bridge-in the assembled transaction is **not** simulated at all (see below), and its fee probe runs with checks relaxed. So write steps that are correct rather than steps that a simulation happens to accept: a malformed sink can reach the chain and abort there.

A bridge-in's simulation is the one that is not run on the exact bytes you sign. It cannot be: those bytes draw on a credited balance that only exists once your deposit has landed and been swept, and Sui checks that balance no matter how a simulation is asked to relax its checks. So a bridge-in is priced and proved by simulating the same commands over the same objects with two substitutions the service controls — a different **sender**, whose own credited balance stands in for the one your deposit has not created yet, and a smaller amount whenever that balance is below the quote's reservation. Two things follow for you:

* **A revert in your steps is still caught at create.** The verdict is real; it is the amount it ran at that is a stand-in.
* **A step whose behaviour depends on the amount can be rejected for the wrong reason.** A deposit with a minimum, a swap with a slippage floor, or anything that aborts on a small input may fail the probe even though the real delivery would have satisfied it. That is a service-side sizing matter, not a bug in your steps — report it rather than reshaping the steps around it, and prove the array with a steps-only execution against the same token in the meantime.

**`400 sui transaction simulation reverted: fee probe aborted at command N …` can appear on any flow**, not only a bridge-in: every create is priced by a probe that runs before anything is signed and fails closed. What differs is what the message means. On a bridge-in the probe is also the only verdict on your steps and it runs at a stand-in amount, so that is where a sound array can be rejected for the wrong reason. On steps-only the probe runs with checks enabled against the real coin, so the same message there is a real revert in your steps. An out-operation runs two: a first probe with checks relaxed that prices the re-quote, then the same checks-on probe as steps-only inside the create, so the message is a real revert there too.

**The command index in an abort message is absolute, not an index into your `steps` array**, and the offset is not a constant. Reconstruct it in two parts.

Materialising the action coin costs **0 to 2** commands ahead of your steps: none at all when `{ACTION_COIN}` is a single owned coin object, one for a credited-balance `redeem_funds` **or** for a `mergeCoins` folding several coin objects together, and two when the intermediary held some of each. (The withdrawal itself is a transaction _input_, not a command.)

The commission pair costs **2** more, placed either ahead of your first step or straight after the last `mergeCoins` that funds `{ACTION_COIN}` — see **Fees**. So your step 0 is command 2, 3 or 4 when the commission leads, and command 0, 1 or 2 when it does not; in the second case every step from the funding merge onward carries the extra 2 as well.

Subtract before concluding that a particular step is at fault. (This is the one place the service's own commands are visible to you; they are absent from the echoed `steps`.) An abort that lands on the commission split itself is reported by name rather than by index — see **Fees** — though only the second, pre-sign simulation can see it: the probe runs at a stand-in commission, and a bridge-in skips that second simulation, so there the split can only fail on chain.

Non-`400` outcomes worth handling:

| Status | Meaning                                                                                                                                                                                                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `401`  | `missing or invalid api token` — a **missing** `x-api-key` is answered before any validation runs, so it never reaches your steps; a key that is present but rejected is only discovered at the 1CLICK quote call, after every step validator has passed, with the same body |
| `409`  | `an execution for this wallet is already in progress. Wait for it to complete or fail before creating a new one`                                                                                                                                                             |
| `502`  | `sui fee estimation probe failed: …` — the service will not sign a transaction it cannot price. On a bridge-in this can also mean the service is not currently provisioned to price that particular coin type, which is an operational matter on our side                    |
| `503`  | `sui bridge-in is temporarily unavailable: bridged deliveries cannot currently be swept, retry later`. Steps-only and out-operation are unaffected                                                                                                                           |

The `409` clears when the blocking execution reaches a terminal status — `SUCCESS`, `DEPOSIT_FAILED`, `OPERATION_FAILED` or `EXPIRED`. A `dry` request is exempt from the in-flight rule, so a preview always goes through. Deleting the blocking row is the other way out, but the two `*_PROCESSING` statuses are not deletable: a bridge-in whose deposit is mid-confirmation (`DEPOSIT_PROCESSING`) and an out-operation waiting on its far-side settlement (`OPERATION_PROCESSING`) can neither be deleted nor superseded, and have to finish.

A Sui **bridge-in** adds a refusal of its own on top of that. Until its derived inbox has been swept, the row is the only handle the service has on a coin the bridge may already have delivered, so a DELETE answers `409 sui bridge-in is awaiting its inbox sweep and cannot be deleted` in every status a DELETE is otherwise allowed from — `CREATED`, `DEPOSIT_PENDING`, `DEPOSIT_FAILED` and `EXPIRED`. A row in a processing status is refused one check earlier with the generic `409 execution is not in a deletable status (current: …)`, so do not match on the sweep wording alone. In practice, treat deleting a Sui bridge-in as unavailable and wait for the blocking execution to reach a terminal status instead.

### Reading chain state before you build steps

Some of what you need to build a correct Sui payload is not in this API, and cannot be: it is on chain. Four reads are worth knowing about. All of them work against a Sui fullnode's gRPC API — the public JSON-RPC is retired, and gRPC-web works from a browser against the public mainnet fullnode with no proxy, so these are not server-side-only. The service speaks gRPC too, so the field names agree.

**Is this Move parameter really by value?** This is the question the sink rule turns on, and no request payload can answer it. Fetch the function's signature and read each parameter's `reference` field: `mutable` for `&mut`, `immutable` for `&`, and **null for by value**. A fourth value, `unknown`, is also possible — treat it as "not established" rather than as by value, since only `null` is the affirmative answer. The `returns` list tells you whether the call hands back a `Coin` you must then consume. Two notes: the parameter list **includes** the trailing `&mut TxContext` that your `arguments` array must omit, so drop it before lining parameter _i_ up with argument _i_; and a published package is immutable, so the answer is cacheable forever. It is a pure package read — no sender, no gas coin, no objects — so it works on a bridge-in whose action coin does not exist yet.

**What owned objects does the intermediary hold?** Owned object ids are not derivable the way a Solana associated token account is — they are created by whichever transaction happened to mint them — so anything you want to name has to be looked up against the resolved intermediary. Send only the **id**; never a version and never a digest.

**What is the intermediary's balance, really?** A balance read returns three numbers, not one: the total, the part held as coin objects, and the part credited to the address as an accumulator balance. Those last two are the disjoint sources the action-coin resolver chooses between, and after a bridge-in sweep the funds sit entirely in the credited balance with **no coin object at all** — so anything that looks only at coin objects will report a fully funded intermediary as empty.

Note that funds enter a credited balance only through the send-funds path (`0x2::coin::send_funds` / `0x2::balance::send_funds`). An ordinary transfer creates a `Coin<T>` object instead, which is a different source.

**Am I over the coin-object merge cap?** Ask for one more than the cap rather than counting everything: past the cap a single page's count saturates and is a floor, which is all the comparison needs. The cap is a deployment setting (64 by default), so treat your client-side number as advisory and let the create's own message be the authority. Remember the refusal only applies when there is no credited balance to draw on instead.

One thing worth doing right before a real create, on any payload naming an owned object: re-read those ids and check their types. A dry run does resolve the ids, so a spent object is caught at preview. What nothing checks is that an object is of the **type** your step uses it as — a mismatch is not a named field error but an abort inside the Move call, which reaches you as an opaque `sui transaction simulation reverted: fee probe aborted at command N: …` at create. Checking the type yourself is what turns that into a message you can act on.

### Building an out-operation

An out-operation runs your steps on Sui and bridges the output to another chain. One of your steps must be the **producer**: the command that pays the 1CLICK deposit address. The service rewrites its amount so the commission comes out of the same total, so the producer must be one of exactly two shapes — anything else is `400` (`outOperation requires a whitelisted transfer to the {DEPOSIT_ADDRESS} (1click deposit) in the Sui steps`):

**1. A `splitCoins` whose first amount a later `transferObjects` pays out.** The amount must be `amounts[0]` and a pure `u64`, and the transfer must take that split's first output — `nestedResult` with `index: 0`, or `result` only when the split has exactly one amount:

```jsonc
[
  {
    "command": "splitCoins",
    "coin":    { "kind": "object", "objectId": "{ACTION_COIN}" },
    "amounts": [ { "kind": "pure", "type": "u64", "value": "2000000000" } ]  // rewritten to amount - fee
  },
  {
    "command":   "transferObjects",
    "arguments": [ { "kind": "nestedResult", "command": 0, "index": 0 } ],
    "recipient": { "kind": "pure", "type": "address", "value": "{DEPOSIT_ADDRESS}" }
  }
]
```

**2. `0x2::pay::split_and_transfer<T>`**, with the amount at `arguments[1]` (a pure `u64`) and the recipient at `arguments[2]`. Remember that the target needs the full 64-hex spelling of `0x2`.

On `EXACT_INPUT` the producer is rewritten to `quote.amount - networkFee`, so the producer and the commission together total the amount the user fixed. On `EXACT_OUTPUT` the producer is baked at `quote.amountIn` and the user signs `amountIn + networkFee`, which is what `{AMOUNT_IN}` substitutes. 1CLICK refunds unused slippage to the intermediary.

### Fees

The service takes its commission **on chain**, as a split out of the action coin. It cannot be appended at the end: when the action coin comes from a credited balance it is a command _result_, so a trailing split would either name a moved value or leave a `Coin<T>` — which has no `drop` ability — live at the end of the transaction. There is no executable shape for appending it, and that case is every bridge-in.

**Where in the array it lands depends on your steps.** The split is emitted one command **after the last `mergeCoins` that folds another coin into the action coin**, and ahead of every step when no step does that. So:

* If your steps never merge into `{ACTION_COIN}` — which is every bridge-in and most steps-only executions — the commission comes off the top, before your first step, and the coin your steps see is already net of it.
* If your steps _fund_ the action coin by merging something into it, the commission is taken just after that merge, out of the funded total. This is what makes an unwind-and-bridge-out work when the intermediary holds only dust of the token to start with: redeem the position, `mergeCoins` the proceeds **into** `{ACTION_COIN}`, and the fee is drawn from the merged coin rather than from the dust.

`mergeCoins`-as-destination is the only funding effect the service can read off the wire, and Sui types that destination as a `&mut` borrow, so the coin provably survives the command that certifies the funding. A merge listing `{ACTION_COIN}` among its **sources** does not count — that is a self-merge, which aborts — and a `moveCall` that funds the coin through a `&mut Coin<T>` parameter is invisible to the scan, so it does not move the commission either.

If the coin cannot cover the commission at the point it is drawn, the create fails with a message that names it rather than an anonymous index: `sui transaction simulation reverted: the <amount> commission split aborted at command N: … (the action coin does not hold the commission at that point in the transaction)`.

Two consequences either way:

* The coin your steps see is already net of the fee. On a bridge-in, `{MIN_AMOUNT_OUT}` substitutes the **post-fee** amount, and the response's `quote.amountOut` / `quote.minAmountOut` are net of it too — so the numbers you display are what the user actually receives. On an out-operation it depends on the swap type: an `EXACT_INPUT` create discards the preliminary quote and re-quotes at `quote.amount - networkFee`, so the figures it returns already price the post-commission input, while an `EXACT_OUTPUT` create keeps the preliminary quote and the commission sits outside it, in `amountIn + networkFee`. Either way the carve also shows up in the echoed producer amount. Both cases describe the `201` only — a **dry** out-operation always echoes the preliminary quote, gross, whatever the swap type. See the previewing quirks below.
* You cannot see the commission in the echoed `steps`. It arrives as `result.details.networkFee`, a decimal string in the **action coin's atomic units**. There is no separate `serviceFee` field.

**A bridge-in costs materially more than the same steps run steps-only.** Its fee includes an allowance for the sweep that moves the delivery into your intermediary — a second, service-funded transaction this one cannot see — and a further allowance on a wallet's very first Sui deposit. Do not present the two fees as comparable, and always quote a bridge-in with a bridge-in preview.

#### How `networkFee` is sized

It is not a pass-through of the sponsor's gas bill — the figure is deliberately over-collected. For native SUI the arithmetic is:

```
netCost    = max(0, computationCost + storageCost - storageRebate)
gross      = netCost + sponsor-side cost
networkFee = ceil(gross × (10000 + <fee buffer bps>) / 10000)
```

Two terms inflate it over what the transaction actually costs. The `<fee buffer bps>` is a deployment setting, **2000 bps — +20% — by default**. And on a bridge-in the sponsor-side term carries the out-of-band sweep plus the first-deposit allowance described above — work this transaction's own gas summary cannot see at all.

So do not reconcile `details.networkFee` against the landed transaction's `computationCost + storageCost - storageRebate` and expect a match, and do not present it to a user as "the network fee". On a steps-only execution it runs about 20% above the sponsor's net charge; on a bridge-in it is higher again by the sweep allowance.

One cushion is _not_ a markup, despite looking like one: the price in `gas_data.price` is the live reference gas price padded by 10%, which protects the transaction against the reference price rising before it broadcasts. The signed transaction carries that same padded price, so it lifts the real charge and the quoted fee together and does not widen the gap between them.

**Native SUI is the one token whose fee cannot fail on a price feed.** Gas is priced in MIST and the fee coin _is_ MIST, so `details.networkFee` needs no oracle in the path. On any other coin type the same figure has to be converted through a price lookup, and both ways that can go wrong end the same: a lookup the service cannot complete, and a charge so small it converts to zero atomic units, each fail the create with `502 sui fee estimation probe failed: …`. There is no silent zero — the service will not sponsor a transaction it cannot bill for. If you are choosing which token to demo a Sui flow with, SUI is the one with fewer moving parts.

#### Previewing a fee

Send `"dry": true` on either create endpoint to price an execution without committing to it. A dry run signs nothing and persists nothing. It returns `200` with the quote (on the quote-backed endpoint), `details.networkFee`, and your steps echoed back verbatim — but **no signing payload**: `messageToSign`, `signingStandard` and `payload` are absent from `details` entirely on a dry run. If the fee cannot be estimated the preview omits `networkFee` rather than failing.

Five Sui-specific quirks when previewing:

* **A dry run still needs real steps.** Both a bridge-in and a steps-only dry preview run the action-coin check before returning, so `"steps": []` is a `400`. An out-operation dry run has no such check: it answers `200` with `networkFee` omitted, which is the unpriced state, not a pass. You cannot use a Sui dry create as a pure quote probe the way you can on EVM and Solana — send the steps you intend to execute. (Omitting `steps` entirely does return an empty shell on steps-only, but not on a bridge-in.)
* **`networkFee` absent means the amounts are not final.** When a preview cannot be priced it still answers `200`, and in that state `quote.amountOut` and `quote.minAmountOut` are the **raw quote figures with no commission carved out**, and an `EXACT_OUTPUT` request has not been grossed up either. Treat a missing `networkFee` as "no usable quote": show it as unavailable rather than displaying amounts the real create will not reproduce.
* **Only a bridge-in preview carves its quote figures.** With `networkFee` present, a bridge-in dry run nets the commission out of both `quote.amountOut` and `quote.minAmountOut`, and grosses an `EXACT_OUTPUT` request up, exactly as the real create will — so for a bridge-in the priced and unpriced states differ only in that one key. An out-operation dry run does neither, priced or not: it returns before the fee-sized re-quote and always echoes the preliminary quote taken at the full `quote.amount`. A priced `EXACT_INPUT` out-op preview therefore reports an `amountOut` / `minAmountOut` **higher** than the `201` will, by roughly the commission's worth of output. Preview an out-operation to price the fee, then re-read the quote figures off the `201`.
* **The bridge-in carve is best-effort.** It only applies where it can: a commission at or above `quote.minAmountOut` leaves `minAmountOut` gross — while `amountOut`, which is carved independently, still comes back net — and the preview still answers `200` with `networkFee` set. The real create rejects that same pair with a `400`. So `networkFee` being present is not on its own proof that the figures beside it were carved — check `networkFee < quote.minAmountOut` before trusting them, because a preview that fails it is a create that will not go through.
* **A dry run reads the chain**, for the live version of every object you named and for your holdings, so it is not free and it is not instant. It does mean a payload naming a nonexistent or already-consumed object is caught at preview time rather than surviving to the real create.

### Signing and submitting

1.  **Create** the execution (steps-only shown — bridge-in and out-operation use `POST /api/v1/executions/{wallet}` with a `quote` and an `x-api-key` header):

    ```
    POST /api/v1/executions/{wallet}/steps
    ```

    with a body carrying `version`, `type: "sui"`, `destinationAsset`, and your `steps`.
2.  The response returns everything you need to sign under `result.details`: a `payload` to sign and a `signingStandard` — which is **your origin wallet's** standard (`erc191` for an EVM origin, `raw_ed25519` for a Solana origin, `nep413` for NEAR, `tip191` for Tron, `sep53` for Stellar, `ton_connect` for TON). You sign `details.payload` exactly as you would for any destination. You never handle the Sui transaction bytes.

    This holds for **all three flows, bridge-in included** — a Sui bridge-in is built and signed once at create, so the `201` already carries a populated `details.messageToSign` and there is no second round trip to wait for.
3.  **Submit** the signature:

    ```
    POST /api/v1/executions/{wallet}/submit
    ```

    The submit body is `{ signature, executionId }` for an EVM or Tron origin. An ed25519 origin (Solana, NEAR, Stellar) also includes `publicKey`. A TON origin includes both `publicKey` and a `tonConnect` envelope, so its body is `{ signature, executionId, publicKey, tonConnect }`.

    A bridge-in returns `{"status": "SIGNED_PENDING_DEPOSIT"}` while it is still waiting on the deposit, and `{"status": "SIGNING"}` if the deposit has already settled. Out-operation and steps-only always return `{"status": "SIGNING"}` and broadcast right away. A bridge-in still reports its deposit through `POST /api/v1/executions/deposit/submit` as on any other chain.

Then poll `GET /api/v1/executions/{wallet}?id=<executionId>` for status. Sui uses the same state machine as every other destination: `CREATED` → `DEPOSIT_PENDING` → `DEPOSIT_PROCESSING` → `OPERATION_PENDING` → `OPERATION_PROCESSING` → `SUCCESS`, with `DEPOSIT_FAILED`, `OPERATION_FAILED` and `EXPIRED` as the failure states. Out-operation and steps-only start at `OPERATION_PENDING`.

**`SUCCESS` means something different on an out-operation.** A bridge-in and a steps-only execution advance to `SUCCESS` on the Sui transaction's own receipt. An out-operation does not: once the Sui transaction lands, the service notifies 1CLICK and **holds the row at `OPERATION_PROCESSING`** until the far-side bridge settlement is confirmed. So on an out-operation `OPERATION_PROCESSING` means "the Sui side is done, the bridge is in flight", and `SUCCESS` means the far side settled. The row also holds the one-live-Sui-execution slot for that whole window.

#### What the echoed steps look like

On a real create the returned `steps` mirror the **user block of the transaction the service signed**, so they are not identical to what you sent:

* Placeholders appear resolved. `{INTERMEDIARY}`, `{DEPOSIT_ADDRESS}`, `{MIN_AMOUNT_OUT}` and `{AMOUNT_IN}` are gone, replaced by the values they resolved to. `{ACTION_COIN}` stays as `{ACTION_COIN}`, because that is exactly what it is in the signed transaction.
* Every pure argument comes back as `{"kind": "pure", "type": "raw", "value": "<hex>"}` carrying its exact encoded bytes, rather than the type and value you wrote. That form re-encodes identically.
* A `moveCall` target comes back with its package address in full 64-hex form.
* A `result` or `nestedResult` whose `command` or `index` is `0` comes back with that key **omitted** — `{"kind": "nestedResult"}` is a reference to step 0, position 0. Missing means zero, both here and in what you send.
* A shared object's `mutable` reflects the **merged** mutability of the single input its id was allocated, so an occurrence you sent by `&` comes back `"mutable": true` when any other step asked for `&mut` on the same id.
* On an out-operation the producer amount comes back **carved**, net of the commission.
* Step-level `metadata` is dropped. Top-level request `metadata` is still echoed at `result.metadata`.
* The service's own commands — materialising the action coin, and the commission — are **not** in the array. The commission reaches you as `details.networkFee`.

A `dry: true` echo is different: it is your steps back verbatim, unresolved.

### Where a bridge-in delivers, and why it takes a moment longer

On a bridge-in the service quotes 1CLICK with a **derived inbox address** as the recipient, not your intermediary. You will see that inbox in the response as `quote.recipient` — it is a real Sui address derived from your intermediary and belonging to it, but it is not the intermediary itself, so do not label it as "your address".

The reason is what makes a Sui bridge-in pre-signable at all. The bridge delivers a brand-new coin object whose id nobody can predict, and bytes signed in advance cannot name an object that does not exist. The inbox is an address that _can_ be computed in advance, and once the delivery lands the service runs a small permissionless sweep that moves it into your intermediary's credited balance — the balance the signed transaction draws on.

What this means for you: your signed transaction is held until the sweep completes, so a bridge-in has one extra hop between "deposit settled" and "transaction broadcast", normally seconds. The execution can sit at `OPERATION_PENDING` or `OPERATION_PROCESSING` for that hop. Nothing about it needs handling in the frontend — poll as usual.

### How your transaction stays valid

A Sui transaction normally needs a gas coin owned by the sender, and goes stale as soon as anything else touches that coin. This service cannot rely on that: the exact transaction bytes are fixed when you **create** the execution — your origin-wallet signature commits to them — but the transaction is not broadcast until well after, once your signature is collected, once the service's own co-signature is produced through the MPC network (a round trip on the order of a couple of minutes), and, on a bridge-in, once your bridged deposit has arrived and been swept.

So the service **sponsors** every Sui transaction out of its own credited SUI balance rather than out of a coin object. There is no gas coin in your transaction at all:

* **Nothing your transaction points at can go stale.** It does not name a gas coin, and a bridge-in names no object of yours either, so nothing another transaction could touch is baked into the bytes you signed.
* **It executes at most once.** Replay protection comes from an epoch window written into the bytes (below), and from the service allowing only one live Sui execution per wallet at a time. The same bytes are never re-signed.
* **You pay no SUI for gas.** The service pays it and recovers it through the commission taken out of the action coin.

#### There is still an expiration window

Because the transaction carries no gas coin, it has to carry its own deadline instead: every Sui transaction the service signs is valid for the **current epoch and the next one**, and is permanently unexecutable after that. A Sui epoch is about 24 hours, so the effective window is roughly **one to two days** from when you create the execution — you cannot compute it exactly, and you should not try to.

Once that window closes, an execution that never made it onto the chain is force-failed (status `OPERATION_FAILED`). There is no resubmit loop behind that — the bytes cannot be re-signed, so the epoch window is the only backstop.

* **Steps-only and out-operation** broadcast as soon as you submit your signature, because the funds are already in place, so they finish far inside the window.
* **Bridge-in** is the case to plan for: the transaction waits for your bridged deposit and its sweep. In practice the quote's own `deadline` is much shorter than the epoch window and is what expires a late bridge-in first, so treat **the quote deadline** as the deposit deadline you show the user.

Funds are not lost when that happens. A bridge-in whose deposit landed late, or landed short, leaves the money credited to your intermediary, and a **steps-only** execution over the same token is the recovery path: `{ACTION_COIN}` resolves to that credited balance.

**A surplus needs the same treatment, on an otherwise successful bridge-in.** The signed transaction reserves exactly the guaranteed `minAmountOut`, so anything the bridge delivers above that stays credited to your intermediary and is untouched by the action. It is not lost, but it will sit there until a steps-only execution spends it, and a frontend that reports "delivered" without accounting for it will understate the user's balance.

### Quick reference

**Commands**

| `command`         | Shape                                                               |
| ----------------- | ------------------------------------------------------------------- |
| `moveCall`        | `target`, optional `typeArguments`, optional `arguments`            |
| `splitCoins`      | `coin`, `amounts[]` — returns a **tuple**, read with `nestedResult` |
| `mergeCoins`      | `coin` (destination), `sources[]`                                   |
| `transferObjects` | `arguments[]` (the objects), `recipient` (a pure `address`)         |
| `makeMoveVec`     | `arguments[]` (the elements), optional single `typeArguments` entry |

**Argument kinds**

| `kind`         | Fields                                                          |
| -------------- | --------------------------------------------------------------- |
| `pure`         | `type`, `value`                                                 |
| `object`       | `objectId`, optional `shared`, optional `mutable` (shared only) |
| `result`       | `command` — an earlier step index, no non-zero `index`          |
| `nestedResult` | `command`, `index` — each `0` when omitted                      |

**Limits**

| Bound                                                       | Value                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| Steps per request                                           | 50                                                                     |
| Step JSON nesting                                           | 15 containers, `metadata` exempt                                       |
| Type arguments per `moveCall`                               | 16, each at most 4096 bytes, nested at most 16 deep                    |
| Encoded size of one pure argument                           | 16383 bytes (the node's gate is strict)                                |
| Commands / inputs / arguments per command                   | 1024 / 2048 / 512 (the count includes the command's singular operand)  |
| Serialized transaction                                      | 130871 bytes (the protocol's 131072 less the 201-byte signed envelope) |
| Coin objects of the action type folded into one action coin | a deployment setting: 64 by default, never above 511                   |
| Request body                                                | 256 KB                                                                 |
| Validity of a signed transaction                            | the current Sui epoch and the next, so roughly 1-2 days                |
