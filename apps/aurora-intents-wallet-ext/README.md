# Aurora Intents wallet extension

A Manifest V3 side-panel wallet on NEAR Intents: passkey accounts, balances,
deposits, swaps, sends and app deposits. Designs: the "Aurora Intents — Chrome
extension" canvas in Claude Design.

`apps/intents-chrome-ext` is the separate Intents Connect demo this app reuses
patterns from; the two can be installed side by side.

## Passkey accounts

A passkey owns an intents account directly: intents.near verifies WebAuthn
(P-256) signatures, and the account ID is derived from the public key
(`0x` + 20 bytes). That ID is **not** an EVM address — nothing on any chain can
sign for it, so it must never be shown or used as one.

- The passkey's RP ID is the extension's origin. The manifest `key` pins the
  extension ID to `nppedgjalfgoidfihoahjfofjbhkefkm`; changing the key orphans
  every passkey created with it. Before publishing, replace the key with the
  public key from the Chrome Web Store dashboard (that is a different ID, so
  dev passkeys won't carry over).
- Creating an account saves the passkey, then signs an empty intent that
  intents.near simulates (`verifyPasskey` from the widget). The account is
  stored only if the contract accepts the signature.
- Accounts live in `chrome.storage.local` (`accounts`). Losing that storage
  loses the passkey's public key; recovering it from the passkey is a planned
  follow-up.

## Wallet accounts

Browser wallets only inject into web pages, so the extension connects them on
its own static page, `connector/`, which it opens in a small unfocused window
when a wallet is needed. The content scripts (`src/content/`, copied from
`apps/intents-chrome-ext` with their own channel) bridge that page's wallets
(EIP-6963, Solana Wallet Standard, NEAR Connect) to the panel. Prompts name the
connector's origin.

The same content scripts run on every web page, so Home can tell when the
open site is connected with the active account's wallet (MetaMask-style
status bar). They only read accounts the site already has (`eth_accounts`,
never a prompt) and answer only this extension, but they make Chrome show the
"read and change your data on all websites" permission at install.

A connected wallet must pass the widget's wallet compatibility check
(`WalletCompatibilityCheck`) before Home opens; the widget records verified
addresses in localStorage (`sw.verifiedWallets`), so it's asked once per
wallet per device.

The page must be served at `VITE_CONNECTOR_URL` (default
`http://localhost:5191/`, baked into the manifest's content-script matches at
build time):

```bash
yarn workspace aurora-intents-wallet-ext connector
```

For a release, deploy `connector/` as a static site and build with
`VITE_CONNECTOR_URL=https://…/`.

### Secondary wallets

An account can have any number of secondary wallets: browser wallets (never
WalletConnect or passkeys) attached to it only to move funds from and to.
They never sign for the account or for apps. Settings → Secondary wallets
lists them; Home's Wallets tab, Swap and Send have a picker for which wallet
to show and spend from, and recipient fields offer the account's other
wallets on the target chain ("My wallets").

To spend from a secondary wallet the widget is configured with that wallet
(`connectedWallets`, `providers`, its family as `intentsAccountType`) and the
account as `intentsAccountId`: balances and the on-chain signature are the
wallet's, refunds return to it, and a swap into intents lands in the account.
The wallet's provider refuses to sign while the wallet has another account
selected than the one connected here. The selection is per account and kept
for the session (`sessionStorage`).

## Balances and deposits

Home shows the account's NEAR Intents balance and, for a connected wallet,
the wallet's own tokens (Alchemy for EVM and Solana, RPC for NEAR).

Deposit addresses are the fee service's persistent deposit addresses with
`recipientType: INTENTS`: whatever arrives is converted to one asset inside
the account, USDC as its single intents representation on NEAR
(`getIntentsTargetToken`, the swap widget's deposit mapping). One address covers every EVM chain; other networks get one each.
They never change, so they are cached per account in `chrome.storage.local`.

## Swap and send

Both run on the swap widget's state machine (quotes, validation, signing) with
the extension's own screens. Both start with a "From" row: the primary wallet
(the account's own wallet, or the passkey), whose token list holds the
account's NEAR Intents balance and the wallet's tokens, or a secondary wallet,
listing only its own tokens. Swaps go into the account, the spending wallet when it's on the
target chain, or — "Send to another address" — to an address on any chain.
Send moves a token to an address on a network of the same asset; wallet
tokens go through 1Click.
Result screens follow 1Click's execution status, so "complete" means filled,
and an unfilled swap shows as refunded.

Passkey accounts sign with the passkey (`webauthn` intents); the fee service's
`submit-intent` must accept `webauthn` signed data. Wallet accounts sign with
their wallet, through the connector page for browser wallets.

## Asset screen

Opening a token from Home shows its price, chart (1D to All), balance, token
details and market data from CoinGecko. Set a key to raise the rate limit;
without one the free public API is used:

```bash
# .env.local
VITE_COINGECKO_API_KEY=CG-…
# A Pro key (pro-api.coingecko.com); a Demo key is assumed otherwise
VITE_COINGECKO_API_PLAN=pro
```

The key ships in the bundle. Tokens CoinGecko doesn't list show their price
without a chart or market data.

## Activity

Activity (the clock in Home's header, and "Your activity" on an asset) lists
the account's swaps, deposits and sends: the widget's 1Click history from the
fee service for the account's address, limited to what was made with this
app's key, refreshed while anything is pending. Its Apps tab (and All) adds
the wallet's Intents Connect executions — deposits into apps — with a detail
screen per deposit; executions from other Intents Connect clients are listed
by their own label.

## Apps

Apps (Home → Apps) deposit into other apps through **Intents Connect**: the
account's wallet signs one execution, its tokens (or a one-time deposit
address, "Another wallet") fund it, and the wallet's Intents Connect account
on the destination chain runs the steps. Wallet accounts only — Intents
Connect has no passkey signing yet, named NEAR accounts can't be resolved,
and secondary wallets never sign for apps — but one of the same family as
the account (e.g. another EVM wallet) can pay: the account signs, and the
connector hands the deposit transfer to that wallet. Deposits must start on
the account's own networks because the service refunds to the signer's
address on the origin chain. One runner lives above the
screens (`apps/AppsRuntime.tsx`), so a deposit keeps being followed while the
user moves around, and one left running from an earlier session is picked up
again (without re-sending its transfer). The service runs one execution per
wallet at a time; a stuck one (this app's or another's) can be cancelled with
one signature.

**Polymarket** bridges to Polygon USDC and swaps it to pUSD into the
Polymarket account (recipe from `apps/intents-chrome-ext`; its
`amountOutMinimum` is still 0 — set one before a public release). The account
is found from the wallet with Polymarket's public profile API
(`gamma-api.polymarket.com`, the manifest's only host permission), else from
the wallet signed in on an open polymarket.com tab, else entered by hand; it's
saved per account (`chrome.storage.local` `polymarketAccounts`). The form
shows a dry-run preview (no signature, no lock) of what arrives, the fee and
the time.

Intents Connect defaults to the alpha service and key (they ship in the
bundle; use the SDK's `apiKeyProxyUrl` before release). Override with:

```bash
VITE_INTENTS_CONNECT_API_URL=https://…
VITE_INTENTS_CONNECT_API_KEY=<key>
```

## Fee service

Point the app (deposit addresses, and the widget's quotes and intents) at
another fee service, e.g. a local one, with:

```bash
# apps/aurora-intents-wallet-ext/.env.local (gitignored, used by dev and build)
VITE_FEE_SERVICE_URL=http://localhost:3005
VITE_PDA_API_KEY=<an app key known to that fee service>
```

## Develop

Packages must be built first (the app consumes their `dist`):

```bash
yarn turbo run build --filter=@aurora-is-near/intents-swap-widget --filter=@aurora-is-near/intents-connect --filter=@aurora-is-near/intents-connect-wallet
yarn workspace aurora-intents-wallet-ext build
```

Then open `chrome://extensions`, enable Developer mode, **Load unpacked** →
`apps/aurora-intents-wallet-ext/dist`, and click the toolbar icon to open the
side panel. The ID shown on the extension card must be the one above.

`yarn workspace aurora-intents-wallet-ext dev` runs the CRXJS dev build with
HMR (load the same `dist`). The same server also serves the panel as a plain
page at http://localhost:5181/sidepanel.html for UI work: outside the
extension, `chrome.storage` is shimmed with `localStorage`, and passkeys use
that origin.
