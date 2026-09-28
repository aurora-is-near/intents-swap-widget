# Intents Connect Chrome extension

End-user counterpart of the Intents Connect SDK: a Manifest V3 side panel that
runs Intents Connect flows on third-party sites, using the wallet the user
already connected there. MVP integration: deposit to Polymarket from any chain.

## How it talks to the page wallet

```
side panel ⇄ chrome.tabs messaging ⇄ relay.ts (isolated world)
relay.ts ⇄ private MessagePort ⇄ pageBridge.ts (MAIN world) ⇄ EIP-6963 / window.ethereum
```

- `src/content/pageBridge.ts` finds the wallet the site is connected to
  (`eth_accounts` is non-empty) and relays requests to it.
- `src/content/relay.ts` enforces a method allowlist (`src/shared/bridge.ts`).
- `src/sidepanel/wallet/` wraps that as an EIP-1193 provider and an Intents
  Connect `WalletConnector`. Wallet prompts show the site's origin
  (polymarket.com) as the requester.

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
