---
icon: book-open
---

# Delete execution Guide

## `DELETE /executions/{wallet}/{executionId}`

Delete a non-final execution by signing the literal string `delete_execution:{executionId}` with the wallet that owns it.

### TL;DR

1. **Message to sign**: the ASCII string `delete_execution:` + the execution ID. No JSON, no envelope, no hashing.
2. **Signing op**: `signMessage` (Solana / NEAR), `personal_sign` (EVM), or TonConnect `signData({type:'text'})` (TON).
3. **HTTP**: `DELETE /api/v1/executions/{walletAddress}/{executionId}`, JSON body. Per-chain shape:

| Chain  | Signing standard | Body fields                                                      |
| ------ | ---------------- | ---------------------------------------------------------------- |
| Solana | `raw_ed25519`    | `signature`, `publicKey`                                         |
| NEAR   | `nep413`         | `signature`, `publicKey`, `nep413{recipient,nonce}`              |
| EVM    | `erc191`         | `signature`                                                      |
| TON    | `ton_connect`    | `signature`, `publicKey`, `tonConnect{domain,timestamp,address}` |

EVM omits `publicKey` because the backend recovers the address via `ecrecover`. Solana, NEAR, and TON must send it — Ed25519 doesn't let the verifier recover the key from the signature. TON additionally sends a `tonConnect` envelope (the wallet folds its `domain`/`timestamp`/ `address` into the signed digest).

### The message

```
delete_execution:e5abf7ce-1187-4562-b2a7-c52d6560f327
```

Build it client-side from the execution ID — there is no GET to fetch it. The backend rebuilds the same string from the URL path and verifies your signature against it.

Do **not** wrap in JSON, do **not** hash, do **not** prepend any chain envelope. The wallet adds whatever framing its standard requires (`"\x19Ethereum Signed Message:"`, NEP-413 borsh, etc.) — that's the wallet's job.

### Solana / `raw_ed25519`

Sign the raw bytes of the message with Phantom (or any Solana wallet exposing `signMessage`).

```js
const message = `delete_execution:${executionId}`
const messageBytes = new TextEncoder().encode(message)

const { signature: sigBytes } = await window.solana.signMessage(messageBytes)
const publicKey = window.solana.publicKey.toBase58()

const body = {
  signature: 'ed25519:' + bs58.encode(Buffer.from(sigBytes)),
  publicKey: 'ed25519:' + publicKey,
}
```

Three encoding details that matter:

1. **Sign bytes, not a string.** `signMessage` expects a `Uint8Array`. Passing the JS string may UTF-8-re-encode in a way that doesn't match what the backend hashes.
2. **Signature is base58, not base64.** Phantom returns 64 raw bytes (`R‖S`). Encode with `bs58`, then prefix with `ed25519:`.
3. **Public key**: Phantom returns it in Solana's native base58 via `publicKey.toBase58()`. Just prefix with `ed25519:` — no further encoding.

Example submit body:

```json
{
  "signature": "ed25519:NGiuLjC6WMTaeWyDRwZ8d9uvqykw3E4Y26PvkMFapnvWP4P3fjpgJn93fjdqtj4XSkYKtAGqtqaHYvRJu3rFcYJ",
  "publicKey": "ed25519:4nn959rPTCxboxXKUxZwMq4knJMKPURA4WciuJyrDAvQ"
}
```

`{walletAddress}` in the URL is the base58 Solana account — the same string `window.solana.publicKey.toBase58()` returns.

### NEAR / `nep413`

Sign a NEP-413 payload with a NEAR wallet (HOT, MyNearWallet, Meteor, etc. — anything exposing `signMessage`), then **also** send the `nonce` and `recipient` in a top-level `nep413` block.

```js
const message = `delete_execution:${executionId}`
const recipient = 'intents.near'

const nonceBytes = crypto.getRandomValues(new Uint8Array(32))
const nonceB64 = btoa(String.fromCharCode(...nonceBytes))

const result = await nearWallet.signMessage({
  message,
  recipient,
  nonce: nonceBytes,            // 32 raw bytes, not the base64 string
})

const publicKey = result.publicKey.startsWith('ed25519:')
  ? result.publicKey
  : 'ed25519:' + result.publicKey

// Wallets return the signature as base64 per NEP-413; backend wants
// ed25519:<base58>. Re-encode unless the wallet already prefixed it.
const signature = result.signature.startsWith('ed25519:')
  ? result.signature
  : 'ed25519:' + bs58.encode(Buffer.from(result.signature, 'base64'))

const body = {
  signature,
  publicKey,
  nep413: { recipient, nonce: nonceB64 },
}
```

Four encoding details that matter:

1. **Nonce is 32 raw bytes for the wallet, base64 on the wire.** The wallet expects 32 bytes; the JSON body carries the same nonce base64-encoded.
2. **Recipient must be exactly `intents.near`.** It is mixed into the signed digest server-side.
3. **Signature re-encoding.** Wallets return base64 per NEP-413; the backend verifier wants base58 with `ed25519:`.
4. **Public key prefix.** Wallets disagree about whether to include `ed25519:`. Detect and add it if missing — never add it twice.

Example submit body:

```json
{
  "signature": "ed25519:5DDM4CJkDP66xEciWmC5cZvb4dzHieSvBrpuQiDcutSBubWcnjeDFmyhrtm3C5puTJY5BTsJwYfSgRMjBrveijJt",
  "publicKey": "ed25519:ASn2sWxWc1KC8qvNsrTcFmrRTrbtwSPkmm46mPvL9crw",
  "nep413": {
    "recipient": "intents.near",
    "nonce": "mxSIcq3Pj9slgPeQYZpY87p4IwV6lAjhEXbxGEnWF+g="
  }
}
```

#### Why send `nep413.{recipient, nonce}` separately?

They're inside the signed payload — why repeat them on the wire?

Because the backend has to **reconstruct the exact bytes the wallet signed** in order to verify the signature, and NEP-413 mixes `recipient` and `nonce` into those bytes (borsh-encoded with the message, then SHA-256-hashed). The signed payload itself isn't sent as a single blob — the wire format splits it into `signature` + `publicKey` + the `nep413` fields, and the server reassembles them.

`nep413` is therefore **mandatory** for NEAR. If you omit it the handler returns `400 {"error": "nep413 fields are required for NEAR"}`. There is no raw-ed25519 path for NEAR — in practice NEAR wallets don't expose raw byte signing anyway, only `signMessage`.

`{walletAddress}` in the URL is either the named account (`alice.near`) or the 64-char hex implicit account.

### TON / `ton_connect`

Sign the literal message via TonConnect's `signData` text payload, then send the signature, the public key, and the wallet-chosen `tonConnect` envelope.

```js
const message = `delete_execution:${executionId}`

// signTonData(message):
const ui = getTonConnectUI()
const account = ui.account
if (!account?.publicKey) {
  throw new Error('TON wallet not connected. Please reconnect.')
}

const result = await ui.signData({ type: 'text', text: message })
const sigBytes = Buffer.from(result.signature, 'base64')
if (sigBytes.length !== 64) {
  throw new Error(`TON signature must be 64 bytes, got ${sigBytes.length}`)
}

const body = {
  signature: 'ed25519:' + bs58.encode(sigBytes),
  publicKey: 'ed25519:' + bs58.encode(Buffer.from(account.publicKey, 'hex')),
  tonConnect: {
    domain: result.domain,
    timestamp: Number(result.timestamp),
    address: result.address,
  },
}
```

Four encoding details that matter:

1. **Use `signData` (text variant), not `sendTransaction`.** This is an off-chain message signature. The wallet builds the `0xffff || "ton-connect/sign-data/" … "txt" …` + SHA-256 digest internally — do not pre-hash, do not wrap.
2. **Signature is base64 from the wallet → base58 on the wire.** Decode to bytes, assert 64 (`R‖S`), `bs58`-encode, prefix `ed25519:`.
3. **`publicKey` is from connect time and mandatory.** A TON address doesn't contain the key — TonConnect exposes `account.publicKey` (hex); `bs58`-encode and prefix `ed25519:`. Use a wallet that returns it (e.g. Tonkeeper).
4. **The `tonConnect` envelope must be sent.** The wallet folds `domain`/`timestamp`/`address` into the signed digest at signing time, so the backend rebuilds the digest from these wire values plus the `delete_execution:<id>` string it reconstructs from the URL.

Example submit body:

```json
{
  "signature": "ed25519:NGiuLjC6WMTaeWyDRwZ8d9uvqykw3E4Y26PvkMFapnvWP4P3fjpgJn93fjdqtj4XSkYKtAGqtqaHYvRJu3rFcYJ",
  "publicKey": "ed25519:4nn959rPTCxboxXKUxZwMq4knJMKPURA4WciuJyrDAvQ",
  "tonConnect": { "domain": "intents.aurora.dev", "timestamp": 1716817039, "address": "UQ…" }
}
```

`publicKey` and `tonConnect` are both required — omit `publicKey` → `400 {"error": "publicKey is required"}`; omit the envelope → `400 {"error": "tonConnect fields are required for TON"}`. Unlike the `/submit` path there's no `signer_id` or deadline check here — there is no stored intent, just the literal message. See `../ton/ton-signature-verification.md`.

`{walletAddress}` in the URL is the URL-safe non-bounceable account (`UQ…`); the bounceable (`EQ…`) and raw (`<workchain>:<hex>`) forms are also accepted.

### EVM / `erc191`

Sign the message as a UTF-8 string with MetaMask `personal_sign` (or any EVM wallet exposing the EIP-191 / `personal_sign` RPC).

```js
const message = `delete_execution:${executionId}`

const sigHex = await window.ethereum.request({
  method: 'personal_sign',
  params: [message, walletAddress],   // [message, signer]
})

// sigHex is 0x<r 32B><s 32B><v 1B>; v comes out as 0x1b (27) or 0x1c (28)
const sigBytes = Buffer.from(sigHex.slice(2), 'hex')
if (sigBytes[64] >= 27) sigBytes[64] -= 27   // normalize v to 0 / 1

const body = {
  signature: 'secp256k1:' + bs58.encode(sigBytes),
}
```

Three encoding details that matter:

1. **Argument order**: `[message, address]`.
2. **`v` normalization**: only byte 64 of the 65-byte signature is touched (`27 → 0`, `28 → 1`). Do not edit `r` or `s`. Do not re-add `27` later.
3. **bs58, not base64**: the backend expects base58 with the `secp256k1:` prefix.

Example submit body:

```json
{
  "signature": "secp256k1:8oQEEa4JNNpuhHrRiTZjgdWsdSEey3s2aaUn6aaHi57QQRAFXGsjuCep2gZaVVNLQ7W94FqekZ8n5Ux3dMK9KhWmN"
}
```

**No `publicKey`.** The backend runs `ecrecover` on `"delete_execution:" + executionId` and the signature, then compares the recovered address to `{walletAddress}` in the URL (case-tolerant).

### HTTP shape

```http
DELETE /api/v1/executions/{walletAddress}/{executionId}
Content-Type: application/json
```

The body is sent in the request body. With `axios.delete` specifically, that means the `data:` option — not the second positional argument:

```js
await axios.delete(
  `${API_URL}/api/v1/executions/${walletAddress}/${encodeURIComponent(executionId)}`,
  { data: body },
)
```

`{walletAddress}` format per chain:

* Solana: base58 (e.g. `7XSfQk…`)
* NEAR: named account (`alice.near`) or 64-char hex implicit
* EVM: `0x…` (40 hex chars, case-tolerant)
* TON: URL-safe non-bounceable user-friendly address (`UQ…`); `EQ…` and raw `<workchain>:<hex>` also accepted

### Preconditions and responses

**Deletable statuses**: `CREATED`, `DEPOSIT_PENDING`, `OPERATION_PENDING`, `EXPIRED`, `DEPOSIT_FAILED`, `OPERATION_FAILED`.

`SUCCESS` is **not** deletable — successful swaps stay in the user's history.

**Response codes**

| Code | When                                            | Body                                |
| ---- | ----------------------------------------------- | ----------------------------------- |
| 200  | Deleted                                         | `{"result": {"status": "DELETED"}}` |
| 400  | Bad signature, missing field, unsupported chain | `{"error": "..."}`                  |
| 404  | Execution not found for this wallet             | `{"error": "..."}`                  |
| 409  | Execution is in a non-deletable status          | `{"error": "..."}`                  |
