---
icon: book-open
---

# Using Solana as destination

This guide explains how to interact with the service when your execution runs on **Solana** — how your account on Solana is addressed, how to describe an on-chain action as a list of steps, and how to sign and submit. It is the conceptual overview. The step format, arg types, placeholders, and rules below are illustrated with inline snippets and a quick reference. For full worked examples see the companion guides (USDC transfer, native SOL, Kamino stake/withdraw).

When an execution targets Solana, the only thing that changes versus any other destination is the **contents of the `steps` array** — each step is a Solana instruction instead of an EVM call. Everything around it (the request envelope, signing with your origin wallet, and the submit call) is the same as for any destination.

### Your Solana intermediary account

The action does not run from your own wallet. It runs from a dedicated **intermediary account** that the service controls on your behalf. On Solana this is an ed25519 account that is **deterministically derived from your origin wallet** — it is stable for a given origin wallet, but you cannot compute it yourself, so you fetch it from the API.

#### Get your Solana address from your origin wallet

Call the intermediary endpoint with your origin wallet in the path. For an EVM origin, that is your `0x…` address:

```
GET /api/v1/executions/0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5/intermediary
```

```jsonc
{
  "result": {
    "originAccount": "0xF1a2B3c4D5E6f7089A0b1C2d3E4f5061728394a5",
    "originType":    "evm",
    "evm":           "0x9c8B7a6F5e4D3c2B1a09F8e7D6c5B4a3928170615",  // your EVM intermediary
    "solana":        "2fjhr2fzcoHYvdKkYpxBsUnE5QDg2hhb2mnxfwrL7RTY"   // your SOLANA intermediary
  }
}
```

Read `result.solana` — that base58 string is **your** Solana intermediary account. The same endpoint works for Solana, NEAR, Stellar, and Tron origins too (TON origins additionally require a `publicKey` query parameter). `solana` is `null` if Solana destinations are not enabled for the deployment.

You normally do **not** paste this address into your steps. Instead you use the placeholder `{INTERMEDIARY}` wherever the intermediary appears (as an owner, authority, or signer), and the service substitutes the real address for you. Fetch the resolved address only when you need to **derive another account from it** — most commonly a token account (below).

#### Your intermediary's token accounts

Token balances are held in **associated token accounts (ATAs)** owned by the intermediary. There is no placeholder for an ATA, because an ATA address depends on the resolved intermediary. So when a step needs one of your intermediary's token accounts:

1. Fetch the resolved Solana intermediary address (above).
2. Derive its associated token account for the relevant mint using the standard associated-token-account derivation (owner = the resolved intermediary, plus the mint and the token program).
3. Put that concrete base58 ATA address into the step's `accounts`.

If a step references both a **mint** and the intermediary's **writable** ATA for that mint, and the ATA does **not exist yet**, the service creates it for you inside the same signed transaction — you do not add a create step, and you are billed its one-time rent only if it was actually missing. This covers the instructions that carry the mint as an account (`TransferChecked`, `MintTo`, `Burn`, and most program deposit/withdraw instructions). A bare SPL `Transfer` (opcode `03`) does **not** list the mint, so the service cannot detect a missing intermediary ATA from it — into a fresh ATA it would revert on-chain. Use `TransferChecked` or add the `CreateIdempotent` yourself. (The one exception to needing an ATA at all is a bridge-in: the destination token's ATA is provisioned by the bridge as it settles your deposit.)

If a step pays out to **someone else's** token account that might not exist, you must include the account-create yourself. Name `{INTERMEDIARY}` as its funder (the only signer you may name) and the service reassigns the funder to the fee payer at signing time.

### The three ways to reach a Solana action

| Mode              | Endpoint                                                    | Envelope                                | When                                                                     |
| ----------------- | ----------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| **Steps-only**    | `POST /api/v1/executions/{wallet}/steps`                    | no `quote`                              | the intermediary already holds the destination token. You just act on it |
| **Bridge-in**     | `POST /api/v1/executions/{wallet}`                          | carries a `quote`, requires `x-api-key` | bridge a token in from another chain and act on it in one signed request |
| **Out-operation** | `POST /api/v1/executions/{wallet}` + `"outOperation": true` | carries a `quote`, requires `x-api-key` | the action runs on Solana and its output is bridged out to another chain |

The Solana step shape applies whenever the action chain is Solana. On `POST /api/v1/executions/{wallet}` an explicit `type` must agree with the action chain: `type: "solana"` means a Solana action, and `type: "evm"` may not target one. On the steps-only endpoint a Solana destination uses Solana steps when `type` is unset or `"solana"`. An explicit `"evm"` there is rejected.

### The step format

Each step is one Solana instruction:

```jsonc
{
  "programId":     "string",   // base58 program address — a real address only, never a placeholder
  "discriminator": "string",   // OPTIONAL hex (no 0x) — the raw instruction-data prefix
  "args":          [ { "name": "amount", "type": "u64", "value": "1000000" } ],
  "accounts":      [ { "pubkey": "string", "isSigner": false, "isWritable": true } ],
  "metadata":      { "name": "…", "description": "…" }   // OPTIONAL display hints
}
```

**`discriminator`** is the byte prefix the target program dispatches on, as hex **without `0x`**. It is prepended verbatim to the encoded args. Common forms:

* An **Anchor** 8-byte discriminator (16 hex chars) = the first 8 bytes of `sha256("global:" + snake_case_instruction_name)`.
* A **1-byte SPL Token** opcode, e.g. `Transfer` = `03`, `TransferChecked` = `0c`.
* A **4-byte little-endian** System discriminant, e.g. `Transfer` = `02000000`.
* Omit it entirely for a program whose instruction data is just its args.

**`args`** are typed and Borsh-encoded. Accepted `type` values (nothing else):

| `type`                        | value form                                                            |
| ----------------------------- | --------------------------------------------------------------------- |
| `u8` `u16` `u32` `u64` `u128` | a number, or a quoted decimal string (prefer quoted for `u64`/`u128`) |
| `i8` `i16` `i32` `i64`        | a number, or a quoted decimal string                                  |
| `bool`                        | `true` / `false`                                                      |
| `pubkey`                      | base58 string (or `{INTERMEDIARY}`)                                   |
| `bytes`                       | hex string **without** `0x`, e.g. `"deadbeef"`                        |
| `string`                      | a UTF-8 string                                                        |

Encoding is strict: an over-width integer (`u8 = 256`) or a negative value for an unsigned type is rejected rather than silently wrapped, and an unknown `type` is rejected. If an instruction needs a type this set can't express (a `Vec`, an `Option`, a struct, a non-32-byte fixed array), Borsh-encode the whole instruction data yourself and send it as a single `discriminator` blob with `"args": []`.

**`accounts`** are listed **in the exact order** the instruction expects. Each carries `isSigner` and `isWritable`. There is **no `value`/lamports field** on a step — to move native SOL you emit an explicit System `Transfer` instruction.

#### The `{INTERMEDIARY}` placeholder

Use `{INTERMEDIARY}` in an account `pubkey` or a `pubkey`-typed arg value wherever your intermediary must appear — typically as the token-account owner / transfer authority / signer. The service substitutes the resolved address before encoding. Substitution touches only account pubkeys and arg values — **never** the `programId` or the `discriminator`.

There are additional placeholders for the bridge-in and out-operation flows:

| Sentinel            | Resolves to                                                        | Valid in                           |
| ------------------- | ------------------------------------------------------------------ | ---------------------------------- |
| `{INTERMEDIARY}`    | your MPC-derived ed25519 Solana account                            | all modes                          |
| `{MIN_AMOUNT_OUT}`  | the post-fee bridged amount (use as a `u64`)                       | bridge-in only                     |
| `{DEPOSIT_ADDRESS}` | the deposit address the output is sent to                          | out-operation only                 |
| `{AMOUNT_IN}`       | the origin commitment (`quote.amountIn` + network fee), as a `u64` | out-operation, `EXACT_OUTPUT` only |

### Rules to follow

* **Only your intermediary may sign.** Across all steps, the only account you may mark `"isSigner": true` is `{INTERMEDIARY}` (the service supplies the fee payer and any other required signer itself). Consequently you cannot build an instruction that needs a brand-new keypair to sign its own creation — e.g. opening a concentrated-liquidity position whose position NFT is a fresh keypair, or creating a non-associated token account. Depositing into an **existing** position is fine. Program-derived accounts (PDAs, associated token accounts) need no signer and are fine.
* **Do not add compute-budget, durable-nonce, or fee instructions.** The service injects the compute-budget and nonce instructions and appends its own fee — adding your own would duplicate them.
* **Stay within the compute budget.** The whole transaction shares a compute-unit budget (200000 by default, set by the deployment) across all your steps. Keep an action comfortably under it or split it across executions. This matters most on a bridge-in, where a transaction that reverts on-chain after signing burns the durable nonce and strands the bridged funds in the intermediary (recoverable later via a steps-only execution).
* **Stay within the size limit.** The assembled transaction must be ≤ 1232 bytes (one packet). For account-heavy actions you can pass a list of address lookup table addresses in the request to fit more accounts under the limit (see below).
* **Every step needs at least one account.** Every account pubkey must be valid base58 (or `{INTERMEDIARY}`). Every `programId` must be a real base58 address, never a placeholder.
* **A steps-only SPL action must touch its destination token** — at least one step must reference the token's mint or the intermediary's associated token account for that mint. Native-SOL destinations are exempt.
* **SPL destinations settle via a gasless relayer (Kora).** The relayer pays the SOL gas and collects the network fee as an SPL transfer in the **destination token**, debited from the intermediary. The destination mint must be on the deployment's `kora_fee_token_mints` allow-list, or create returns `400` (`"destination mint is not in the configured kora_fee_token_mints allow-list"`). Native-SOL destinations pay a SOL fee instead.

The service validates steps **before** signing, so mistakes surface as a descriptive `400` rather than a late on-chain failure. Two non-`400` create outcomes are also worth handling: `409` if an execution for this wallet is already in progress (only one in-flight execution per wallet / destination chain at a time), and `503` (`"no durable nonce account available, retry shortly"`) when the durable-nonce pool is momentarily exhausted.

### Signing and submitting

1.  **Create** the execution (steps-only shown — bridge-in and out-operation use `POST /api/v1/executions/{wallet}` with a `quote`):

    ```
    POST /api/v1/executions/{wallet}/steps
    ```

    with a body carrying `version`, `type: "solana"`, the destination asset id, and your `steps`. Add `"dry": true` to preview the network fee without committing.
2. The response returns everything you need to sign under `result.details`: a `payload` to sign and a `signingStandard` — which is **your origin wallet's** standard (`erc191` for an EVM origin, `raw_ed25519` for a Solana origin, `nep413` for NEAR, `tip191` for Tron, `sep53` for Stellar, `ton_connect` for TON). You sign `details.payload` exactly as you would for any destination. You never handle the inner Solana message.
3.  **Submit** the signature:

    ```
    POST /api/v1/executions/{wallet}/submit
    ```

    The submit body is `{ signature, executionId }` for an EVM or Tron origin. An ed25519 origin (Solana, NEAR, Stellar) also includes `publicKey`. A TON origin includes both `publicKey` and a `tonConnect` envelope, so its body is `{ signature, executionId, publicKey, tonConnect }`.

On a real create the returned `steps` mirror the exact transaction the service signs, so they are not identical to what you sent. They include any associated-token-account create the service prepended and the fee instruction it appended, and your `{INTERMEDIARY}` placeholders appear resolved to concrete addresses. Injected instructions render generically — their full instruction data as the `discriminator`, with empty `args`. To preview the network fee, send `dry: true`. A `dry: true` echo omits the injected compute-budget / nonce / fee instructions. Steps-only and out-operation echoes are otherwise your submitted steps verbatim, while a bridge-in echo additionally resolves `{MIN_AMOUNT_OUT}` to its post-fee value (`{INTERMEDIARY}` / `{DEPOSIT_ADDRESS}` stay as placeholders).

### How your transaction stays valid — durable nonces

A normal Solana transaction is pinned to a recent blockhash and expires once that blockhash is more than **150 blocks** old — on the order of a minute or two. This service cannot rely on that. The exact transaction bytes are fixed when you **create** the execution — your origin-wallet signature commits to them — but the transaction is not broadcast until well after: once your signature is collected, once the service's own co-signature is produced through the MPC network (a round-trip on the order of a couple of minutes), and, on a **bridge-in**, once your bridged deposit has actually arrived. That gap easily outlives a blockhash.

So the service pins every Solana transaction to a **durable nonce** instead of a recent blockhash. What this means for you:

* **Your signed transaction does not go stale.** It stays valid while the service waits for signing and (on a bridge-in) for the deposit, then broadcasts once.
* **It executes at most once.** The nonce advances the instant the transaction lands — success or revert alike — so the same bytes can never replay. This is the mechanism behind the compute-budget warning above: because a revert still advances the nonce, the service cannot re-broadcast a transaction that reverted on-chain.

#### There is still an expiration window

A durable nonce is a limited, pooled resource, so the service will not hold one open indefinitely. If an execution has not completed within a **hold window of 25 minutes** (the deployment default), measured from when you create it, the service force-fails the execution (status `OPERATION_FAILED`) and reclaims the nonce.

* **Steps-only and out-operation** broadcast as soon as you submit your signature, because the funds are already in place, so they normally finish well within the window.
* **Bridge-in** is the case to plan for: the transaction sits waiting for your bridged deposit. Treat the hold window as an effective **deadline for that deposit to arrive** — if it has not landed in time, the execution is failed and you must create a fresh one. The quote's own `deadline` can expire a bridge-in earlier, so whichever is shorter wins.

### Fitting large actions — address lookup tables

A fully-inline Solana message lists every account at 32 bytes and hits the 1232-byte single-packet limit at roughly 35 accounts. Many real actions (an aggregated swap, for example) reference more. To fit them, pass the action's **address lookup table** addresses as a top-level `addressLookupTables` array on the create body, and the service emits a **versioned (v0)** message that compresses matching accounts into lookup indices:

```jsonc
{
  "type": "solana",
  "steps": [ /* unchanged — still list every account inline */ ],
  "addressLookupTables": [ "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" ]
}
```

* **Additive.** Omit it (or send `[]`) and nothing changes — a legacy message is built exactly as before.
* **You still list every account inline** in each step. The tables only tell the service which accounts it _may_ compress. You pre-compress nothing.
* **Signers and program ids stay inline** — only non-signer, non-program accounts fold into lookup indices, so lookup tables help account-heavy actions, not signer- or program-heavy ones.
* At most 16 tables per request by default (deployment-configurable). Each must be valid base58 and resolve on-chain.
* **Signing is unchanged** — a v0 message just carries a one-byte version prefix. You sign the payload the same way.

### Quick reference

**SPL Token program** `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` — common opcodes:

| Opcode | Instruction     |
| ------ | --------------- |
| `03`   | Transfer        |
| `07`   | MintTo          |
| `08`   | Burn            |
| `09`   | CloseAccount    |
| `0c`   | TransferChecked |

**System program** `11111111111111111111111111111111` — `Transfer` = discriminant `02000000`, a `u64` lamports arg, accounts `[from, to]`.

**Anchor programs** use an 8-byte discriminator = first 8 bytes of `sha256("global:" + snake_case_instruction_name)`, hex-encoded (16 chars).
