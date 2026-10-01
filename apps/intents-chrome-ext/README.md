# Intents Connect Chrome extension

End-user counterpart of the Intents Connect SDK: a Manifest V3 side panel that
runs Intents Connect flows on third-party sites, using the wallet the user
already connected there. MVP integration: deposit to Polymarket from any chain.

## How it talks to the page wallet

```
side panel ⇄ chrome.tabs messaging ⇄ relay.ts (isolated world)
relay.ts ⇄ private MessagePort ⇄ pageBridge.ts (MAIN world) ⇄ EIP-6963 / window.ethereum
```

- `src/content/pageBridge.ts` reports every EVM wallet (EIP-6963) with the
  accounts it shares with the site, and relays each request to the wallet it
  names.
- `src/content/solanaWallets.ts` discovers Solana wallets through the Wallet
  Standard and relays `connect` / `signMessage` / `signTransaction` (as
  serialized bytes) to the wallet named in the request.
- `src/content/nearWallets.ts` discovers NEAR wallets through near-connect's
  injection protocol (`near-selector-ready` → `near-wallet-injected`) and
  relays `signIn`, NEP-413 `signMessage` and `signAndSendTransactions`. NEAR
  wallets are always connected through the extension (no site uses them).
- The user picks the signing wallet in the panel (`src/sidepanel/wallet/`):
  - **Site wallet** (default): the wallet the site is already connected with,
    used as-is through the site's tab. The extension never connects wallets
    to the site.
  - **Extension wallets**: any other detected wallet, connected to the
    extension's own origin — the static `connector/` page, which the panel
    opens in a small popup window on demand. Prompts name that origin, and the
    site never sees these connections. Connected wallets are remembered in
    `chrome.storage.local`; wallets reconnect silently to their trusted origin.

## Connector page

`connector/index.html` must be served over the URL in `VITE_CONNECTOR_URL`
(default `http://localhost:5190/`, which is baked into the manifest's
content-script matches at build time). Locally:

```bash
yarn workspace intents-chrome-ext connector
```

For a release, deploy `connector/` as a static site (e.g. an aurora.dev
subdomain) and build with `VITE_CONNECTOR_URL=https://…/`.

## Develop

Packages must be built first (the app consumes their `dist`):

```bash
yarn turbo run build --filter=@aurora-is-near/intents-connect --filter=@aurora-is-near/intents-connect-wallet --filter=@aurora-is-near/intents-swap-widget
yarn workspace intents-chrome-ext build
```

Then open `chrome://extensions`, enable Developer mode, **Load unpacked** →
`apps/intents-chrome-ext/dist`, and click the toolbar icon to open the side
panel. Polymarket tabs opened before loading the extension must be reloaded.

`yarn workspace intents-chrome-ext dev` runs the CRXJS dev build with HMR for
the side panel (load the same `dist` folder).

## Styling

Swap-widget components are compiled with the widget theme duplicated in
`src/sidepanel/styles/` (see the note there about `@theme inline`); the
widget's prebuilt `styles.css` is not used.
