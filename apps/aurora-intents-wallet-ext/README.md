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
the extension's own screens. Swaps spend the account's NEAR Intents balance:
into another intents token, or out to an address on any chain ("Send to
another address"). Send withdraws a token to an address on a network of the
same asset.

Passkey accounts sign with the passkey (`webauthn` intents); the fee service's
`submit-intent` must accept `webauthn` signed data. Wallet accounts sign with
their wallet, through the connector page for browser wallets.

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
yarn turbo run build --filter=@aurora-is-near/intents-swap-widget
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
