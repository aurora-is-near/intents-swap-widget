# `src/ui`: the future `@aurora-is-near/intents-connect-ui`

A drop-in "supply from any wallet, on any chain" modal for a dApp, built on
the headless SDK (`@aurora-is-near/intents-connect` and
`@aurora-is-near/intents-connect-wallet`). In this extension it is mounted on
app.aave.com. Nothing in here imports `src/page`, `src/aave` or
`src/config`: the page and the protocol come in through props.

## What the dApp passes

```tsx
<SupplyModal
  open={open}
  onClose={close}
  dappName="Aave"
  positionOwner={account}            // the dApp's connected account, or null
  dappWalletName="MetaMask"           // optional: names the dApp's wallet
  destination={{
    title: 'Aave Base V3',
    supported: true,                  // false: show `hint` instead
    hint,
    options,                          // what can be supplied into; undefined while loading
    optionsError,
    buildPlan,                        // (input) => ExecutionPlan<void>
  }}
  sdk={{ api, intentsApi, alchemyApiKey }} // IntentsConnectProvider props, minus `wallet`
  walletConnect={walletConnect}       // optional: EVM phones in the QR code tab
  tonConnect={tonConnect}             // optional: TON phones in the QR code tab
  connectorOptions={{ sol: { rpcUrl } }}  // optional, keep it stable
  walletSources={walletSources}       // optional: e.g. [stellarWallets(), tronWallets()], created once
  theme={{ seed: { accent: '#6c3cff' } }} // optional: derive a theme, or set `tokens`; keep it stable
/>
```

| Prop | The dApp's job |
|---|---|
| `positionOwner` | The account the supply is made for. Without one, the modal asks to connect on the dApp first. |
| `destination.options` | `SupplyOption[]`: the positions it can take funds into (`chain`, `tokenAddress` or none for the native token, `decimals`, `apy`, `unavailable`). The modal offers only those Intents Connect can deliver, and blocks when there are none. |
| `destination.buildPlan` | Turns `{ option, destinationAsset, origin, amount }` into the plan: the recipe (the dApp's own steps) and the quote. Leave `quote.deadline` unset, because the quote is refreshed. It must be stable (memoized), or the quote restarts. |
| `sdk` | The API clients. The modal renders `IntentsConnectProvider` itself, with the wallet the user picks. |
| `walletConnect` | A client from `createWalletConnectClient`, with a `storagePrefix` when the page runs WalletConnect too. |
| `tonConnect` | A client from `createTonConnectClient` for TON phones: not the one behind `tonWallets(…)` for extensions, since a TON Connect session holds one wallet. |
| `walletSources` | Detection sources for families `./detect` doesn't build in, e.g. `stellarWallets()` from `intents-connect-wallet/detect/stellar` or `tronWallets()` from `…/detect/tron`. Create them once, at module scope. |
| `theme` | `{ seed, tokens }`: a few choices to derive every token from (below), and/or exact token values, which win. |

Everything else is the modal's: wallet detection and choice, balances, the
quote, the run, recovery, and the in-flight check.

## What it uses from the SDK

- **intents-connect/react:** `IntentsConnectProvider`, `useIntentsConnectFlow`
  (one runner, kept above the dialog so a run outlives a close),
  `useQuotePreview`, `useSupportedTokens`, `useWalletBalances` and
  `useWalletExecutions`.
- **intents-connect-wallet:**
  - `./detect` and `./detect/react` for browser wallets;
  - `./detect/connector`'s `toWalletConnector`;
  - `./connect/walletconnect` (`toWalletConnectConnector`, `PAIRING_TTL_MS`).

Peers: `react` 18+, `qr-code-styling`, and the chain peers of the wallet
subpaths above (`viem`, `@solana/web3.js`, `@solana/spl-token`,
`@walletconnect/universal-provider`).

## Styling

- It renders into a shadow root (`createShadowHost` in `mount.ts`), so the
  page's CSS can't reach it and its CSS can't leak out.
- `styles.css` is Tailwind v4, imported as a string (`?inline`) into the root.
- **Theme tokens.** Every visual value is a token: colors, the font and its
  sizes, radii, shadows' colors and the spacing unit. `ThemeTokens` in
  `theme/tokens.ts` lists them, and `DEFAULT_TOKENS` carries Aave's light
  theme. `ThemeStyle` writes them, with the `theme` prop's overrides, as
  `:host` custom properties (`CSS_VARIABLES` names each one).
  - `styles.css` maps them onto Tailwind (`@theme inline`): colors
    (`bg-field`, `bg-overlay`, `text-text-muted`…), `text-xs/sm/base`,
    `text-button` and `text-amount`, the radii (`rounded-dialog`, `-card`,
    `-control`, `-chip`, `-cta`), and `--spacing`, which every `p-*`,
    `gap-*`, `h-*` and `leading-*` multiplies.
  - Tailwind's rem-based type scale and radii are switched off, and all
    sizes are px, so the host page's `<html>` font size can't scale the
    modal.
  - Two whites stay literal on purpose: the QR code's tile (a QR scans dark
    on light) and the tile behind wallet logos.
- **Derived themes.** `deriveTokens(seed)` (`theme/derive.ts`) builds every
  token from a `ThemeSeed`: the scheme, font, base size and weight, page and
  card colors, text, the accent and its text, danger, the button and card
  radii, and a density.
  - Shades are OKLab mixes (`theme/color.ts`, no dependency); hairlines,
    tracks and shadows are alphas.
  - Every text color is held to a minimum WCAG contrast against the dialog
    and its fields (primary 7, secondary 4.5, muted 3), moved in lightness
    until it reads. A site's own text on its accent is kept from 3:1;
    otherwise the CTA text is black or white.
  - Sizes are clamped (radius 0–24, density 0.85–1.2, text 13–16 px).
  - `DEFAULT_SEED` is Aave's, and a test pins that it derives
    `DEFAULT_TOKENS` within ΔE 0.02.
- `all: initial` on `:host` cuts inheritance from the page. Only placement
  goes inline on the host, since an inline style beats `:host`.
- Chrome ignores `@property` inside a shadow root, and Tailwind needs it for
  its `--tw-*` defaults. So those rules are hoisted to `document.head`; they
  only register custom properties.
- The font is Inter with a system fallback, and contextual alternates are
  off (Inter draws "0x" as "0×").

## What it stores

`localStorage` on the dApp's origin:
- `aurora-intents.wallet`: the wallet chosen to pay with;
- `aurora-intents.walletconnect.paired`: a phone was paired, so restoring
  the session is worth a relay connection;
- the SDK's own keys (`intents-connect.connectedWallets`, verification);
- WalletConnect's IndexedDB under its prefix.

## Before it becomes a package

- **Aave wording:** some copy still names Aave's own screens ("Your
  supplies", "Supply button"). It should come through props.
- **Data tables:** token icons and chain names come from the swap widget's
  `/constants`. The gas left on MAX and the explorer URLs are local tables.
  Both should become package data or props.
- **Missing pieces:**
  - no i18n;
  - unit tests cover the theme (`yarn test`); the rest was checked by hand
    on a local harness and on app.aave.com.
