---
icon: wallet
description: Wallet and intents balances, wallet verification, and user sessions for confidential balances.
---

# Account & balances

> **Beta.** Part of the [TypeScript SDK](README.md).

Besides running executions, `@aurora-is-near/intents-connect` reads everything an account screen needs, for EVM, Solana and NEAR wallets:

| Feature | Core function | React hook |
|---|---|---|
| The wallet's `intents.near` account | `getWalletIntentsAccountId(wallet)` | `useIntentsAccount()` |
| On-chain wallet balances | `getWalletBalances(…)` | `useWalletBalances()` |
| Public intents balances | `intentsApi.getIntentsAccountBalances(id)` | `useIntentsBalances()` |
| Wallet verification | `verifyWallet(wallet, …)` | `useWalletVerification()` |
| Session for confidential balances | `createIntentsSession(…)` | `useIntentsAuth()`, `useConfidentialBalances()` |

Everything goes through the Aurora intents API (`intents-api.aurora.dev`), keyed by your API key from [studio.aurora.dev](https://studio.aurora.dev):

```ts
import { createIntentsApi } from '@aurora-is-near/intents-connect';

const intentsApi = createIntentsApi({ apiKey: 'YOUR_API_KEY' });
```

## React

Pass `intentsApi` to the same provider that runs executions:

```tsx
import {
  IntentsConnectProvider,
  useConfidentialBalances,
  useIntentsAuth,
  useIntentsBalances,
  useWalletBalances,
} from '@aurora-is-near/intents-connect/react';

<IntentsConnectProvider
  api={api}
  wallet={connector}
  intentsApi={intentsApi}
  alchemyApiKey={ALCHEMY_KEY}>
  <Account />
</IntentsConnectProvider>;

function Account() {
  const wallet = useWalletBalances();
  const intents = useIntentsBalances();
  const auth = useIntentsAuth();
  const confidential = useConfidentialBalances();

  return auth.status === 'authorized' ? (
    <Balances wallet={wallet.balances} intents={intents.balances} confidential={confidential.balances} />
  ) : (
    <button onClick={() => auth.authorize({ verify: true })}>Show private balances</button>
  );
}
```

`connector` can be any `WalletConnector`, including one built from a wallet already connected to the page; see [Wallet integrations](../wallet-integrations.md#detected-wallets).

Hooks share provider-level stores: two components reading the same balances make one request. Data hooks poll every 60 s while the page is visible (`refreshIntervalMs`, `0` to disable) and expose `refresh()`.

## Wallet balances

`getWalletBalances` reads the wallet's balance of every token in the intents API token list that its chain family can hold:

- **Alchemy first.** With `alchemyApiKey`, every EVM and Solana chain Alchemy indexes is read in as few as one request.
- **Then RPCs.** Other chains, or all of them without a key, use JSON-RPC: `DEFAULT_RPCS` (the swap widget's public endpoints), overridden **per chain** by `rpcs`.
- **NEAR** reads native NEAR (`native-near`) and every NEP-141 over public NEAR RPCs, with the intents API's NEAR proxy as the last fallback. 1Click has no native NEAR asset: quote it with `toQuoteAssetId(token)` (wNEAR), and the `/near` transfer wraps native NEAR on the way.

```ts
import { getTokens, getWalletBalances } from '@aurora-is-near/intents-connect';

const tokens = await getTokens(intentsApi);
const { balances, errors } = await getWalletBalances({
  family: 'evm',
  address: '0x…',
  tokens,
  alchemyApiKey: ALCHEMY_KEY,
  rpcs: { base: ['https://my-base-rpc.example'] },
});
// balances: { 'nep141:base.omft.near': '1500000000000000', … } — smallest units
// errors:   { bsc: BalanceRpcError } — chains that could not be (fully) read
```

Chains fail independently. A token missing from `balances` was not read; `'0'` means it was read and is empty.

{% hint style="warning" %}
**Solana SPL tokens need a capable endpoint.** The free public Solana RPCs refuse or heavily rate-limit the token-account query (`getTokenAccountsByOwner`), so without an Alchemy key or your own keyed Solana RPC only native SOL is reliable. A refused SPL read shows up in `errors.sol` while SOL itself is still returned.
{% endhint %}

## Intents balances

Public balances of the wallet's intents account on `intents.near` — every non-zero token, read by the intents API:

```ts
const { blockHeight, balances } =
  await intentsApi.getIntentsAccountBalances(intentsAccountId);
```

The account id is derived from the wallet: an EVM or NEAR address lower-cased, a Solana address as the hex of its public key (`getIntentsAccountId`).

## Verification

`verifyWallet` asks the wallet to sign an **ownership proof** — an empty intent (`"intents": []`) that moves nothing — and has `intents.near` simulate it. A pass is remembered (in `localStorage` by default) so the user is not asked again.

```ts
const store = createVerificationStore();
const { verdict, proof } = await verifyWallet(wallet, {
  store,
  rpcUrls: proofRpcUrls(intentsApi),
});
// verdict: { ok: true } | { ok: false, reason: 'SIGNATURE_REJECTED' | 'NONCE_REJECTED' | 'PUBLIC_KEY_NOT_REGISTERED' }
```

RPC failures **throw**; they are never reported as "not verified".

**Named NEAR accounts** (`alice.near`) can only sign for their intents account with a key registered on `intents.near` (`add_public_key`). Until then `verifyWallet` reports `PUBLIC_KEY_NOT_REGISTERED`, and authorization fails with `SIGNATURE_REJECTED` — authorize with `verify: true` to get the named reason first. Implicit accounts (64-hex) need nothing.

## Confidential balances

Confidential balances belong to the user, so reading them needs a **user session**. The session is opened by exchanging an ownership proof — one wallet signature:

```ts
const session = createIntentsSession({ intentsApi });

await session.authorize(wallet); // signs the proof, opens the session
const { balances } = await session.getConfidentialBalances();
```

With `verify: true` (`useIntentsAuth().authorize({ verify: true })`), the same proof is first simulated and recorded as verified, then used to authorize — still **one** prompt.

The session refreshes its access token before it expires and retries a read once after a `401`. When the refresh token itself expires, `state.status` becomes `'expired'` and the user signs again. Lifetimes are set by the auth service (currently 15 minutes for the access token and 7 days for the refresh token).

{% hint style="warning" %}
**Sessions are kept in memory by default**, so a reload asks for a new signature. You can pass `storage` (`webStorage(localStorage)`, or your own `KeyValueStorage`), but the refresh token mints access tokens for its whole lifetime: anything that can read that storage can read the user's confidential balances.
{% endhint %}

Errors are `SessionError`s with a `code`: `SIGNATURE_REJECTED`, `CLOCK_SKEW` (the device clock is more than 5 minutes off), `UNSUPPORTED_STANDARD`, `NOT_AUTHORIZED`, `SESSION_EXPIRED`, `WALLET_NOT_CONNECTED`, and `SUPERSEDED` (the account changed before the call finished; its result was discarded). A declined wallet prompt is an `OwnershipError` with code `USER_REJECTED`.

## Funding a deposit from intents balances

A deposit can also be paid from public or confidential intents balances. It runs in two legs:

1. A 1Click swap from the intents account to the wallet's intermediary. The user signs the transfer intent 1Click prepares.
2. A steps-only execution that spends what arrived.

`fundIntermediaryFromIntents` runs the first leg. `useIntentsFundedFlow` runs both, and `useIntermediaryBalance` shows funds still waiting at the intermediary.

The quote and the intent are checked before the wallet prompts. A signed transfer is persisted and only watched after a reload, never signed again. Confidential funding needs an authorized session (`withAccessToken`). Leg B is still public on the destination chain.

## Rate limits

The intents API's NEAR RPC proxy (`/rpc/:apiKey`) is limited per API key — shared by every user of your integration. The SDK only uses it first for rare proof calls (salt, simulation); balance reads go to public NEAR RPCs first.

## Next

- [Wallet integrations](../wallet-integrations.md): detecting connected wallets
- [React](react.md): provider props and every hook
- [Lifecycle & errors](lifecycle-and-errors.md): executions
