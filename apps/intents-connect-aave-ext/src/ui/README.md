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
  walletConnect={walletConnect}       // optional: EVM phones in the Phone tab
  tonConnect={tonConnect}             // optional: TON phones in the Phone tab
  connectorOptions={{ sol: { rpcUrl } }}  // optional, keep it stable
  walletSources={walletSources}       // optional: e.g. [stellarWallets(), tronWallets()], created once
  readOnly={notice}                   // optional: every screen, no supply (a preview)
  onOpen={open}                       // optional: the completion notice's "View"
  onStatus={showStatus}               // optional: the supply's status, e.g. on the dApp's button
  onSupplied={refreshPositions}       // optional: once per landed supply
  intent="aave_supply"                // optional: the recipe's intent; History lists those runs
  theme={{ auto: { pin: { cardRadius: 12 } } }} // optional: read from the page by default; keep it stable
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
| `destination.buildStepsPlan` | Optional. The same supply as a steps-only plan (`flow: 'steps-only'`, `feeFromAmount: true`) that spends `{ option, destinationAsset, amount }` already waiting at the user's intermediary. With it, funds a failed supply left can be supplied from the modal. |
| `onOpen` | Opens the modal. The completion notice's **View** calls it. |
| `onStatus` | Every change in the supply's status, open or closed: `idle`, `action` (sign, confirm, resume), `running`, `success`, `failed`, each with a short label. For the dApp's own button or a badge. |
| `onSupplied` | `{ executionId, option }`, once per supply that landed (a recovery too): refresh the dApp's position data. |
| `intent` | The `intent` the dApp's recipes carry (echoed in every execution's `metadata`). History lists only those runs, and the in-flight check ignores other apps' runs. Without it there is no History. |
| `readOnly` | A notice the Supply button shows instead of supplying: every screen and quote works, nothing runs. The extension sets it for its theme preview off app.aave.com. |
| `theme` | `{ auto, seed, tokens }`. `auto` (on by default) reads a seed from the page; pass `false` to skip it, or hints: `selectors` (`primaryButton`, `button`, `card`) and `pin` (seed values the reading can't change). `seed` overrides the reading, and the whole is derived into tokens (below). Exact `tokens` win over everything. |

Everything else is the modal's: wallet detection and choice, balances, the
quote, the run, recovery, and the in-flight check.

## When a supply's last step fails

The bridge delivers, then the intermediary's steps fail (a reserve at its
supply cap, a price move): the service ends the execution in
`OPERATION_FAILED`, with no refund, and the funds stay at the wallet's
intermediary, which only that wallet can move.

- The progress screen says so in plain words, and shows what waits
  (`useIntermediaryBalance` for the reserve's token).
- After a reload, the assets screen shows it too: the wallet's
  `OPERATION_FAILED` executions name the tokens, and the balance decides,
  so funds already supplied show nothing.
- **Supply it** opens a recovery screen: `previewSteps` of the dApp's
  `buildStepsPlan` (what lands, and the fee), re-priced every 25 s, then
  `runSteps` on the same runner. It's kept by the modal, so it outlives a
  close, and it reports through `onStatus` and `onSupplied` like a supply.

## Outside the modal

The run lives above the dialog, so it keeps going when the modal closes.
- `onStatus` reports where it is, for the dApp to show on its own button.
- When it ends while the modal is closed, a notice in a corner of the page
  says so, with **View** (`onOpen`). A success hides after 10 s; a failure
  stays until dismissed.
- `onSupplied` fires once per execution that landed.

## Transfer: paying from anywhere

The wallet screen's **Transfer** tab supplies by a transfer to a deposit
address, from an exchange or any wallet. Nothing in the dApp's props
changes: the modal runs the dApp's plan with `depositViaWallet: false`.

- **Origins** (`transfer/origins.ts`): `useSupportedTokens().origins` on the
  `evm`, `sol`, `tron` and `near` families, as `BalanceToken`s, most asked
  for first; deprecated and test tokens left out. TON signers and Stellar
  origins are refused by the service in this mode (checked by dry create).
- **The signer** (`transfer/signer.ts`) is a wallet of the origin's family:
  the service refunds to the signer's address on the origin chain, and
  refuses a signer of another family ("refundTo is not valid"). EVM origins
  sign with the dApp's own wallet; others with the family's active wallet,
  else one that shares an account (no prompt), else one the user connects
  (`SignerPicker`).
- **Quotes** (`transfer/preview.ts`): the form hands `useQuotePreview` a
  runner whose `preview` stamps `depositViaWallet: false` and a 30 min
  deadline on the dApp's plan, so the shown quote is the run's, refreshes
  don't flash, and `run()` runs exactly it.
- **The run is saved on the runner's `created` event**
  (`progress/transfers.ts`): the service doesn't say how a run is funded,
  and a found transfer must resume with `depositViaWallet: false` (an
  unsigned one would otherwise make the wallet send after signing). Saved
  runs resume at once, with no Resume step unless unsigned; the in-flight
  check also looks for saved runs that are `EXPIRED` (which frees the
  wallet's lock, so the in-flight list misses them).
- **The deposit panel** (`progress/DepositPanel.tsx`, state in
  `depositState.ts`): QR of the plain address, the exact amount (never
  rounded), the network as exchanges name it, the token contract, memo,
  countdown; then the expired notice, whatever the SDK's phase says.
  **Start over** cancels a run the SDK still follows (it holds the runner),
  then starts over.

## History

The clock in the header opens a list of past supplies, over any screen;
Back (or Escape) returns to it as it was, a typed amount included.
- **Which runs.** Every wallet the page shows an account for: detected
  wallets sharing one, the paired EVM phone and the paired TON phone. Each
  is read with `useWalletExecutions({ address })` while History is open
  (every 30 s), under the spelling its connector reports, which is the
  spelling the service files runs under (it matches EVM addresses
  exactly).
- **What's listed** (`history/entries.ts`): runs with the dApp's `intent`,
  each once (the active wallet's copy when two wallets share an address),
  newest first, the latest 50. Quotes nobody signed that then expired are
  left out: nothing moved.
- **A row:** what was paid and into what (`10 USDC → USDC`), the chain and
  wallet, when, and a status: Supplied, Needs you, In progress, Failed or
  Expired. A steps-only run (funds that waited) reads "Supplied … that was
  waiting".
- **One run:** the amounts ("at least" what the quote guaranteed), where,
  when, the wallet, the supply transaction and the execution id. A failed
  supply from the active wallet shows what it left, to supply.
- **Open it:** an unfinished run opens on the progress screen, through the
  same path as the reload check (`progress/runOf.ts`): Resume when it needs
  the user, otherwise it's followed. A run from another wallet switches to
  it first (it already shares an account, so nothing prompts). Never over a
  live run or a running recovery, never in a `readOnly` preview; the run on
  screen just says **Back to it**.

## What it uses from the SDK

- **intents-connect/react:** `IntentsConnectProvider`, `useIntentsConnectFlow`
  (one runner, kept above the dialog so a run outlives a close),
  `useQuotePreview`, `useSupportedTokens`, `useWalletBalances`,
  `useWalletExecutions` and `useIntermediaryBalance`; the runner's
  `previewSteps` / `runSteps` for funds a failed supply left.
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
    (`bg-field`, `bg-control`, `bg-overlay`, `text-text-muted`…), `text-xs/sm/base`,
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
  - Fields, lists and bars are a shade of the dialog (`field`), not the
    page's cards, so a site with tinted cards doesn't tint the whole
    dialog. The card tint goes to controls (`control`): secondary
    buttons, the selected tab, "Connect" chips, unless the cards sit on
    the other side of light and dark from the page.
  - The CTA's text keeps 3:1 on the disabled fill too: it still says
    what's missing ("Enter an amount").
  - Success (`success`, `success-bg`: a supply that landed) is green on
    every site, not read from the page: its text keeps 4.5:1 on the dialog,
    the fields and its own tint.
  - Sizes are clamped (radius 0–24, density 0.85–1.2, text 13–16 px, the
    emphasis weight 500–700 so titles stand out from 400 body text).
  - `DEFAULT_SEED` is Aave's, and a test pins that it derives
    `DEFAULT_TOKENS` within ΔE 0.02.
- **Page themes.** By default, `readPageTheme` (`theme/read/`) reads a seed
  from the page the modal runs on, so the modal blends into any dApp. Each
  field comes from the first source that has it, and `evidence` names it:
  1. the hints' `pin`;
  2. the page background, text and font family as rendered (html, body,
     then the app root, `theme-color` last);
  3. design-system variables, for surfaces, the accent and its text,
     secondary text and danger: MUI CssVars (its exact `*Channel` triples
     first), shadcn, Radix, Mantine, Bootstrap;
  4. measured components: the page's primary button (filled buttons that
     stand out, scored by chroma, size, a primary-sounding class and the
     hint selector), cards (area-weighted fills that differ from the page,
     from a viewport grid), and the buttons' median radius for the control
     radius. Radii are always measured. Spacing (density) and the font size
     are never read: the modal keeps its own on every site.
  - The accent's text and the emphasis weight come from the page's buttons
    painted in the accent, whichever source named it: Bootstrap has no
    variable for the white on its primary.
  - Colors are normalized through a 1×1 canvas when they don't parse
    (Chrome reports `color(display-p3 …)`, `lab()`, names), clamped to sRGB.
  - Our own nodes (`[data-aurora-intents]`: the host and the in-page
    button) are skipped. Only the top document is read, not iframes or
    closed shadow roots.
  - `usePageTheme` reads once when the modal mounts, and again (debounced
    300 ms) when `html` or `body` attributes change or the OS color scheme
    flips, so a site's dark-mode toggle restyles the modal.
  - `safeReadPageTheme` gives adapters the same reading: Aave's in-page
    button takes the derived `cta`, `cta-hover` and `cta-text`.
- **Theme inspector** (`theme/inspect/`). `THEME_INSPECTOR` is a build-time
  constant: on in dev builds and where the build defines
  `import.meta.env.VITE_THEME_INSPECTOR` as `'true'` (this extension does,
  in every build). Off, the build drops the panel, its store and the hooks
  that feed it.
  `installThemeInspector({ open })` adds the switches: `?aurora-theme=inspect`
  in the URL, or `auroraIntents.theme.inspect()` / `.close()` in the console.
  - It renders in its own shadow root, above the modal, with fixed neutral
    styles, and keeps keys typed in it from the page and the modal.
  - `ThemeStyle` publishes what it applies (the theme, the reading, the
    tokens) to a small store, and applies the inspector's seed edits.
  - It shows each seed value with its source (`pin`, `mui`, `body`,
    `buttons(3)`, `edit`…), with pickers, sliders and text fields to edit
    it; each text token's contrast against the minimum above; the token
    table; and "Copy as config".
  - The config is the theme with each edit pinned (`auto.pin`), or in
    `seed` where the theme sets it there (`themeConfig`). The modal applies
    edits as that same config, reading the page again with the pins, so
    what it shows is what the copied config gives.
- `all: initial` on `:host` cuts inheritance from the page. Only placement
  goes inline on the host, since an inline style beats `:host`.
- Chrome ignores `@property` inside a shadow root, and Tailwind needs it for
  its `--tw-*` defaults. So those rules are hoisted to `document.head`; they
  only register custom properties.
- The default font is Inter with a system fallback (a page theme takes the
  page's), and contextual alternates are off (Inter draws "0x" as "0×").

## What it stores

`localStorage` on the dApp's origin:
- `aurora-intents.wallet`: the wallet chosen to pay with;
- `aurora-intents.walletconnect.paired`: a phone was paired, so restoring
  the session is worth a relay connection;
- `aurora-intents.transfers`: supplies paid by a transfer (execution id,
  signer, origin, deadline), kept a day, so they resume as transfers;
- the SDK's own keys (`intents-connect.connectedWallets`, verification);
- WalletConnect's IndexedDB under its prefix.

## Before it becomes a package

- **Aave wording:** some copy still names Aave's own screens ("Your
  supplies", "Supply button"). It should come through props.
- **Data tables:** token icons and chain names come from the swap widget's
  `/constants`. Chain icons are already the UI's own (`assets/chains/`,
  copied from the widget's: importing its root pulls in all of it, Node
  `crypto` included). The gas left on MAX and the explorer URLs are local
  tables. All should become package data or props.
- **Missing pieces:**
  - no i18n;
  - unit tests cover the theme (`yarn test`); the rest was checked by hand
    on a local harness and on app.aave.com.
