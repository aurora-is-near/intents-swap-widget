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

The page must be served at `VITE_CONNECTOR_URL` (default
`http://localhost:5191/`, baked into the manifest's content-script matches at
build time):

```bash
yarn workspace aurora-intents-wallet-ext connector
```

For a release, deploy `connector/` as a static site and build with
`VITE_CONNECTOR_URL=https://…/`.

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
