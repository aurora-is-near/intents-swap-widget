---
icon: book-open
---

# Submit signing

How to sign the message returned by `GET /api/v1/executions/{walletAddress}` and post it back to `POST /api/v1/executions/{walletAddress}/submit`, for all six signing standards: `erc191` (EVM / MetaMask), `nep413` (NEAR), `raw_ed25519` (Solana / Phantom), `sep53` (Stellar / Freighter), `ton_connect` (TON / Tonkeeper), and `tip191` (Tron / TronLink).

### TL;DR

| Chain   | `signingStandard` | What to sign                                                  | Signing op                           | Submit body fields                                    | Signature encoding              |
| ------- | ----------------- | ------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------- | ------------------------------- |
| EVM     | `erc191`          | `payload.payload_json` (string, verbatim)                     | `personal_sign` (EIP-191)            | `signature`, `executionId`                            | `secp256k1:` + bs58(`r‖s‖v0/1`) |
| NEAR    | `nep413`          | `payload.payload_json` (parsed → `{message,recipient,nonce}`) | NEP-413 `signMessage`                | `signature`, `publicKey`, `executionId`               | `ed25519:` + bs58(64 raw bytes) |
| Solana  | `raw_ed25519`     | decoded bytes of `payload.payload_bytes_base64`               | `signMessage(bytes)`                 | `signature`, `publicKey`, `executionId`               | `ed25519:` + bs58(64 raw bytes) |
| Stellar | `sep53`           | `payload.payload_json` (string, verbatim)                     | Freighter `signMessage` (SEP-53)     | `signature`, `publicKey`, `executionId`               | `ed25519:` + bs58(64 raw bytes) |
| TON     | `ton_connect`     | `payload.payload_json` (string, verbatim, as TonConnect text) | TonConnect `signData({type:'text'})` | `signature`, `publicKey`, `tonConnect`, `executionId` | `ed25519:` + bs58(64 raw bytes) |
| Tron    | `tip191`          | `payload.payload_json` (string, verbatim)                     | `signMessageV2` (TIP-191)            | `signature`, `executionId`                            | `secp256k1:` + bs58(`r‖s‖v0/1`) |

`publicKey` is **required** for NEAR/Solana/Stellar/TON and **omitted** for EVM and Tron (both secp256k1, signer recovered from the signature) — see below. TON additionally requires a `tonConnect` envelope — see the TON section.

### The exact field to sign

Starting from the execution response:

```
GET /api/v1/executions/{walletAddress}
→ result.details.payload.{ payload_json, payload_bytes_base64, standard }
```

A typical execution payload:

```json
{
  "result": {
    "details": {
      "payload": {
        "payload_json": "{\"deadline\":\"2026-05-27T13:37:19Z\",\"intents\":[...],\"signer_id\":\"...\",\"verifying_contract\":\"intents.near\"}",
        "payload_bytes_base64": "eyJkZWFkbGluZSI6...",
        "standard": "erc191"
      },
      "signingStandard": "erc191"
    }
  }
}
```

`payload_json` is the canonical source-of-truth field — always reach for `result.details.payload.payload_json`. `payload_bytes_base64` is just the same JSON pre-encoded to the exact bytes the backend will verify against; it exists so Solana clients can sidestep UTF-8 surprises (see Solana section below).

Per chain:

* **`erc191`** → sign `payload.payload_json` verbatim as a string. Do not `JSON.parse` it and then `JSON.stringify` it — that can reorder keys or change whitespace and will change the hash. Do not pre-hash with keccak256; `personal_sign` hashes for you.
* **`nep413`** → `payload.payload_json` may be a JSON string or an already-parsed object; parse if it's a string, then feed `{ message, recipient, nonce }` to the NEAR wallet's `signMessage`. The wallet builds the NEP-413 prefix tag, borsh-encodes the payload, and hashes with SHA-256 internally — do not pre-hash, do not pre-borsh.
* **`raw_ed25519`** → base64-decode `payload.payload_bytes_base64` to a `Uint8Array` and sign those bytes. Do **not** sign `payload_json` directly here: Phantom's `signMessage` accepts a `Uint8Array`, and some wallet versions UTF-8 re-encode strings in a way that does not byte-match what the backend hashes. Do not wrap in any envelope (no SIWS, no `"\x19Solana Signed Message:"`), do not pre-hash.
* **`sep53`** → sign `payload.payload_json` verbatim as a string (same field as `erc191`), passing it to Freighter's `signMessage`. Do not pre-hash and do not wrap it yourself — Freighter applies the SEP-53 framing (`"Stellar Signed Message:\n"` domain prefix + SHA-256) internally, and the backend's `sep53` verifier expects exactly that.
* **`ton_connect`** → sign `payload.payload_json` verbatim as the TonConnect **text** payload via `signData({ type: 'text', text })`. Do not pre-hash and do not wrap it — TonConnect builds the `0xffff || "ton-connect/sign-data/" … "txt" …` + SHA-256 digest internally. Unlike the others, you must also return the wallet-chosen `tonConnect` envelope (`{domain, timestamp, address}`) so the backend can rebuild that digest — see the TON section.
* **`tip191`** → sign `payload.payload_json` verbatim as a string (same field as `erc191`), passing it to TronLink's `signMessageV2`. Do not pre-hash and do not wrap it yourself — the wallet applies the TIP-191 framing (`"\x19TRON Signed Message:\n"` prefix + keccak256) internally, the Tron analog of `personal_sign`.

### EVM / `erc191`

```js
// `payload` here is `result.details.payload` from the execution response.
const payloadJSON =
  typeof payload.payload_json === 'string'
    ? payload.payload_json
    : JSON.stringify(payload.payload_json)

const sigHex = await window.ethereum.request({
  method: 'personal_sign',
  params: [payloadJSON, walletAddress],   // [message, signer]
})

// sigHex is 0x<r 32B><s 32B><v 1B>; v comes out as 0x1b (27) or 0x1c (28)
const sigBytes = Buffer.from(sigHex.slice(2), 'hex')
if (sigBytes[64] >= 27) sigBytes[64] -= 27   // normalize v to 0 / 1

const signature = 'secp256k1:' + bs58.encode(sigBytes)
```

Three encoding details that matter:

1. **Argument order**: `[message, address]`.
2. **`v` normalization**: only byte 64 of the 65-byte signature is touched (`27 → 0`, `28 → 1`). Do not edit `r` or `s`. Do not re-add `27` later.
3. **bs58, not base64**: the NEAR intents verifier expects base58 with the `secp256k1:` prefix.

Submit body:

```http
POST /api/v1/executions/{walletAddress}/submit
Content-Type: application/json

{
  "signature": "secp256k1:ASzCLKN2HFa…",
  "executionId": "e5abf7ce-1187-4562-b2a7-c52d6560f327"
}
```

**Do not include `publicKey`.** The backend runs `ecrecover` on the signature + the `payload_json` it has on file and compares the recovered address to the execution's `signer_id` (lowercase `0x…` for erc191).

### NEAR / `nep413`

```js
const nearWallet = nearWalletRef.current
if (!nearWallet) throw new Error('NEAR wallet not connected. Please reconnect.')

const nep413Payload =
  typeof payload.payload_json === 'string'
    ? JSON.parse(payload.payload_json)
    : payload.payload_json

const nonceBytes = Uint8Array.from(
  atob(nep413Payload.nonce),
  (c) => c.charCodeAt(0),
)

const result = await nearWallet.signMessage({
  message:   nep413Payload.message,
  recipient: nep413Payload.recipient,
  nonce:     nonceBytes,
})

const publicKey = result.publicKey.startsWith('ed25519:')
  ? result.publicKey
  : 'ed25519:' + result.publicKey

// HOT returns the signature as base64 (per NEP-413), but the backend wants
// ed25519:<base58>. Re-encode here.
const sigBytes =
  typeof result.signature === 'string'
    ? result.signature.startsWith('ed25519:')
      ? null
      : Buffer.from(result.signature, 'base64')
    : Buffer.from(result.signature)

const signature =
  sigBytes === null ? result.signature : 'ed25519:' + bs58.encode(sigBytes)

return { signature, publicKey }
```

Four encoding details that matter:

1. **Nonce is base64 → `Uint8Array`.** Don't pass the base64 string to the wallet. The wallet expects 32 raw bytes; if it receives the string, the borsh-encoded payload diverges from what the backend verifies.
2. **Signature re-encoding.** NEP-413 wallets return base64. The backend verifier wants base58 with the `ed25519:` prefix. Decode base64 → bytes → bs58 → prefix.
3. **Public key prefix.** Wallets disagree about whether to include `ed25519:`. Detect and add it if missing — never add it twice.
4. **No envelope on the message.** Don't prepend `"NEAR Signed Message:"` or anything similar. NEP-413's framing is what the wallet adds internally; doing it yourself double-wraps.

Submit body:

```http
POST /api/v1/executions/{walletAddress}/submit
Content-Type: application/json

{
  "signature":   "ed25519:3N2B…",
  "publicKey":   "ed25519:ED7S…",
  "executionId": "e5abf7ce-1187-4562-b2a7-c52d6560f327"
}
```

Three fields only. `nonce`, `recipient`, `callbackUrl`, `state`, `accountId` are **not** sent — the backend already has them from the execution it issued and only needs the signature material to verify.

### Solana / `raw_ed25519`

```js
// `payload` here is `result.details.payload` from the execution response.
const payloadBytes = Uint8Array.from(
  atob(payload.payload_bytes_base64),
  (c) => c.charCodeAt(0),
)

const { signature: sigBytes } = await window.solana.signMessage(payloadBytes)
const publicKey = window.solana.publicKey.toBase58()

return {
  signature: 'ed25519:' + bs58.encode(Buffer.from(sigBytes)),
  publicKey: 'ed25519:' + publicKey,
}
```

Three encoding details that matter:

1. **Sign bytes, not a string.** `signMessage` accepts a `Uint8Array`; pass the decoded buffer directly.
2. **Signature is base58, not base64.** Phantom returns 64 raw bytes (`R‖S`). Encode with `bs58`, then prefix with `ed25519:`.
3. **Public key**: Phantom returns it in Solana's native base58 via `publicKey.toBase58()`. Just prefix with `ed25519:` — no further encoding. There is no `v` byte and no normalization step (that's an ERC-191 / secp256k1 thing).

Submit body:

```http
POST /api/v1/executions/{walletAddress}/submit
Content-Type: application/json

{
  "signature":   "ed25519:5QXh…",
  "publicKey":   "ed25519:7XSf…",
  "executionId": "e5abf7ce-1187-4562-b2a7-c52d6560f327"
}
```

The backend uses `publicKey` as both the verification key and — base58-decoded — as the `signer_id` it compares against the execution.

### Stellar / `sep53`

```js
// `payload` here is `result.details.payload` from the execution response.
// `walletAddress` is the connected Stellar account (G… StrKey).
const payloadJSON =
  typeof payload.payload_json === 'string'
    ? payload.payload_json
    : JSON.stringify(payload.payload_json)

const result = await freighter.signMessage(payloadJSON, { address: walletAddress })
if (result?.error) {
  throw new Error(result.error?.message ?? 'Freighter signMessage failed')
}

const { signedMessage, signerAddress } = result
const sigBytes =
  signedMessage instanceof Uint8Array
    ? Buffer.from(signedMessage)
    : Buffer.from(signedMessage, 'base64')
if (sigBytes.length !== 64) {
  throw new Error(`SEP-53 signature must be 64 bytes, got ${sigBytes.length}`)
}

const pubkeyBytes = StrKey.decodeEd25519PublicKey(signerAddress ?? walletAddress)

return {
  signature: 'ed25519:' + bs58.encode(sigBytes),
  publicKey: 'ed25519:' + bs58.encode(Buffer.from(pubkeyBytes)),
}
```

Four encoding details that matter:

1. **Sign the `payload_json` string** (like `erc191`). Don't pre-hash and don't wrap it yourself — Freighter applies the SEP-53 framing (`"Stellar Signed Message:\n"` prefix + SHA-256) internally, and the backend's `sep53` verifier expects exactly that.
2. **`signedMessage` may be base64 or a `Uint8Array`.** Freighter versions disagree; normalize to a 64-byte `R‖S` buffer and assert the length — a different length means the wallet returned something other than a raw Ed25519 signature.
3. **Signature is base58, not base64.** Encode the 64 bytes with `bs58`, then prefix with `ed25519:` (same as NEAR / Solana).
4. **Public key needs `StrKey` decoding first.** The Stellar address is a `G…` StrKey string, **not** raw base58. Decode it with `StrKey.decodeEd25519PublicKey()` to 32 raw bytes, then bs58-encode and prefix with `ed25519:`. Do **not** bs58 the `G…` string directly (unlike Solana, where `publicKey.toBase58()` is already the right base58).

Submit body:

```http
POST /api/v1/executions/{walletAddress}/submit
Content-Type: application/json

{
  "signature":   "ed25519:5QXh…",
  "publicKey":   "ed25519:7XSf…",
  "executionId": "e5abf7ce-1187-4562-b2a7-c52d6560f327"
}
```

Same three fields as NEAR/Solana. `publicKey` is **required** — Ed25519 cannot be recovered from the signature alone. `{walletAddress}` in the URL is the Stellar `G…` account from Freighter `requestAccess().address`.

#### Stellar deposit (memo required)

Separate from signing the `/submit` message: a Stellar deposit also needs a **memo**, and it must appear in **two** places. Stellar 1Click uses a _shared_ deposit address, so the per-quote memo is the only thing that attributes the incoming funds to your quote — omit it on either step and the deposit is lost.

```js
// The quote (POST /api/v1/executions/{walletAddress}) returns these for Stellar:
const { depositAddress, depositMemo } = executionResult.quote

// 1) The on-chain payment MUST carry the memo (MEMO_TEXT, ≤ 28 bytes).
const builder = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
  .addOperation(Operation.payment({ destination: depositAddress, asset, amount }))
if (depositMemo) builder.addMemo(Memo.text(depositMemo))
const tx = builder.setTimeout(180).build()
// …Freighter signTransaction → Horizon submitTransaction → { hash: txHash }

// 2) Record the deposit WITH the same memo.
await axios.post(`${API_URL}/api/v1/executions/deposit/submit`, {
  txHash,
  depositAddress,
  ...(depositMemo ? { memo: depositMemo } : {}),
})
```

### TON / `ton_connect`

```js
// `payload` here is `result.details.payload` from the execution response.
// The frontend dispatches on the standard, then signs via TonConnect.
const text =
  typeof payload.payload_json === 'string'
    ? payload.payload_json
    : JSON.stringify(payload.payload_json)

// signTonData(text):
const ui = getTonConnectUI()
const account = ui.account
if (!account?.publicKey) {
  throw new Error('TON wallet not connected. Please reconnect.')
}

const result = await ui.signData({ type: 'text', text })
const sigBytes = Buffer.from(result.signature, 'base64')
if (sigBytes.length !== 64) {
  throw new Error(`TON signature must be 64 bytes, got ${sigBytes.length}`)
}

return {
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

1. **Use `signData` (text variant), not `sendTransaction`.** This is an off-chain message signature, not an on-chain transaction. The wallet builds the `0xffff || "ton-connect/sign-data/" … "txt" …` + SHA-256 digest internally — do not pre-hash, do not wrap the text.
2. **Signature is base64 from the wallet → base58 on the wire.** TonConnect returns base64; decode to bytes, assert 64 (`R‖S`), `bs58`-encode, then prefix `ed25519:` (same as NEAR / Solana / Stellar).
3. **`publicKey` is from connect time and mandatory.** A TON address doesn't contain the key, so it can't be derived from the address or recovered from the signature. TonConnect exposes `account.publicKey` (hex) at connect; `bs58`-encode and prefix `ed25519:`. Use a wallet that returns the account public key (e.g. Tonkeeper).
4. **The `tonConnect` envelope must be sent.** The wallet folds `domain`, `timestamp`, and `address` into the signed digest and picks them at signing time, so the backend rebuilds the digest from these wire values plus its stored copy of the payload. No other chain sends this.

Submit body:

```http
POST /api/v1/executions/{walletAddress}/submit
Content-Type: application/json

{
  "signature":   "ed25519:5QXh…",
  "publicKey":   "ed25519:7XSf…",
  "tonConnect":  { "domain": "…", "timestamp": 1716817039, "address": "UQ…" },
  "executionId": "e5abf7ce-1187-4562-b2a7-c52d6560f327"
}
```

`publicKey` and `tonConnect` are both **required**. Omitting the envelope returns `400 {"error": "tonConnect {domain, timestamp, address} is required for TON"}`. `{walletAddress}` is the URL-safe non-bounceable account (`UQ…`). Full per-chain TON guide: `ton-signing.md`. Backend rationale: `../ton/ton-public-key.md` and `../ton/ton-signature-verification.md`.

### Tron / `tip191`

```js
// `payload` here is `result.details.payload` from the execution response.
const payloadJSON =
  typeof payload.payload_json === 'string'
    ? payload.payload_json
    : JSON.stringify(payload.payload_json)

// signMessageV2 applies "\x19TRON Signed Message:\n" + len + msg + keccak256
const sigHex = await window.tronWeb.trx.signMessageV2(payloadJSON)

// sigHex is 0x<r 32B><s 32B><v 1B>; v comes out as 0x1b (27) or 0x1c (28)
const sigBytes = Buffer.from(sigHex.replace(/^0x/, ''), 'hex')
if (sigBytes[64] >= 27) sigBytes[64] -= 27   // normalize v to 0 / 1

const signature = 'secp256k1:' + bs58.encode(sigBytes)
```

Three encoding details that matter:

1. **Use `signMessageV2`, not the legacy `sign`/`signMessage`.** Only V2 implements TIP-191 (the `\x19TRON Signed Message:\n` prefix the backend verifies); the older calls use a different, incompatible scheme.
2. **`v` normalization**: only byte 64 of the 65-byte signature is touched (`27 → 0`, `28 → 1`). Do not edit `r` or `s`. Identical to `erc191`.
3. **bs58, not base64**: base58 with the `secp256k1:` prefix.

Submit body:

```http
POST /api/v1/executions/{walletAddress}/submit
Content-Type: application/json

{
  "signature": "secp256k1:ASzCLKN2HFa…",
  "executionId": "e5abf7ce-1187-4562-b2a7-c52d6560f327"
}
```

**Do not include `publicKey`.** The backend recovers the secp256k1 signer, converts the wallet's base58 `T…` address to its embedded 20-byte account, and compares. Full per-chain guide: `tron-signing.md`.

### Why `publicKey` is required for NEAR/Solana/Stellar/TON but not EVM/Tron

Ed25519 (NEP-413, `raw_ed25519`, `sep53`, and `ton_connect`) does not let the verifier recover the public key from the signature alone — the backend needs `publicKey` to verify and to derive the `signer_id`.

secp256k1 (`erc191` and `tip191`) does: `ecrecover` reconstructs the address from the signature + message, so the field is omitted on the wire. Tron addresses embed the same 20-byte account as the recovered EVM address, so the recovered signer maps straight onto the base58 `T…` wallet.

**TON is a further special case.** Its address is `hash(StateInit(code, pubkey))`, so the key isn't even contained in the address (unlike a Solana base58 address or a Stellar `G…` StrKey, where the key can be read off the address). The frontend supplies the connect-time key, and the backend additionally proves that key **owns** the claimed wallet by re-deriving the address from it across every known wallet version — see `../ton/ton-public-key.md`.

### HTTP shape

```http
POST /api/v1/executions/{walletAddress}/submit
Content-Type: application/json
```

`{walletAddress}` format per chain:

* **Solana** — base58 (e.g. `7XSfQk…`), the same string `window.solana.publicKey.toBase58()` returns.
* **NEAR** — named account (`alice.near`) or 64-char hex implicit account, the same string returned by `wallet.getAccounts()[0].accountId`.
* **EVM** — `0x…` (40 hex chars, case-tolerant).
* **Stellar** — `G…` StrKey ed25519 address, the same string Freighter `requestAccess()` returns.
* **TON** — URL-safe non-bounceable user-friendly address (`UQ…`), the string `Address.parse(account.address).toString({ urlSafe: true, bounceable: false })` returns. The bounceable (`EQ…`) and raw (`<workchain>:<hex>`) forms are also accepted — the backend matches on `(workchain, accountHash)`, not the raw string.
* **Tron** — base58 `T…` address (e.g. `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`), the string `window.tronWeb.defaultAddress.base58` returns.
