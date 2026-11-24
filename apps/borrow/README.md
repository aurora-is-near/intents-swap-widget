# Borrow

Aurora's one-click borrow app: a Vite + React SPA built on the
`@aurora-is-near/ui-kit` design language.

## Run it

```sh
yarn install
yarn turbo run dev --filter=borrow
```

Turbo builds the kit first: the app imports its JavaScript from
`packages/ui-kit/dist`. Running `yarn dev` inside `apps/borrow` directly
needs a built kit (`yarn turbo run build --filter=@aurora-is-near/ui-kit`).

Other tasks, through turbo so the kit is built before them:

```sh
yarn turbo run build typecheck lint test --filter=borrow
```

## How it is put together

- **Routes** (`src/router.tsx`, TanStack Router, code-based): `/` is the New
  loan tab, `/positions` is My positions, both inside the shell layout route;
  any other path redirects to `/`. Path routes need an SPA rewrite to
  `index.html` when deployed.
- **Dev-only gallery**: in `vite dev` only (`import.meta.env.DEV`), `/gallery`
  renders the kit's gallery full page, lazily imported from the kit's
  `@aurora-is-near/ui-kit/gallery` source export (TSX, not `dist`). In a
  production build the route and its chunk are absent, and `/gallery`
  redirects to `/`.
- **Shell** (`src/shell/`): the page column, header (logo, the Borrow
  section, theme toggle, wallet button), hero, the route-driven tabs and the
  reduced footer (logo, tagline and copyright; dark in both themes).
- **Tab panels**: New loan shows `src/loan/NewLoanForm.tsx`, the
  artboard's two columns: the loan form beside the live market list
  (`src/loan/MarketList.tsx`), the LTV / Liquidation / Health tiles and,
  disconnected, the working "Connect wallet to borrow on Aave" CTA. My
  positions shows
  `src/positions/PositionsEmptyState.tsx`: "Connect wallet" when
  disconnected, "No positions right now" with "Make a loan" when connected.
- **Wallet** (`src/wallet/`): `WalletProvider.tsx` mounts Reown AppKit (EVM
  and Solana) inside `ThemeProvider`, and keeps the connect modal's theme in
  step with the kit's. Set `VITE_REOWN_PROJECT_ID` to Borrow's own Reown
  project in production; unset, AppKit falls back to the wallet package's
  shared Aurora id. `WalletButton.tsx` in the header connects, and when
  connected shows the short address and disconnects on click.
- **Theme**: `ThemeProvider` from the kit wraps the router.
  `plugins/themeInitScript.ts` inlines the kit's `getThemeInitScript()` in
  `<head>`, with the same storage key (`src/theme.ts`), so a stored choice
  applies before React mounts.
- **CSS** (`src/index.css`): Tailwind, then the kit's stylesheet. `#root`
  has `isolation: isolate`, so the kit's portalled popups stack above the
  app. The `mobile:` variant is the artboards' `max-width: 640px` block.
- **Intents Connect** (`src/config.ts`, `src/wallet/`): one API client with
  no key; `IntentsConnectProvider` gets it and the AppKit wallet (`null`
  while disconnected), under a `QueryClientProvider`. `src/intentsApi.ts`
  is the intents API client the SDK's balance hooks need, passed to the
  provider from `App.tsx`. Its key, `VITE_INTENTS_API_KEY`, is **required**
  and public (it travels in the URL path); unset, the app logs a
  configuration error at start-up and no balances load.
- **API-key proxy** (`server/intentsConnectProxy.ts`): the SDK's two create
  calls (`POST api/v1/executions/:wallet` and `…/:wallet/steps`) go to
  `/api/intents-connect`, which adds `x-api-key` from the server-only
  `INTENTS_CONNECT_API_KEY` and forwards them; any other path or method is
  refused. `plugins/intentsConnectProxy.ts` mounts it in `vite dev` and
  `vite preview`, and the Vercel Edge Function `api/intents-connect.ts` in
  production. Put the key in `.env.local` (see `.env.example`); never prefix
  it with `VITE_`.
- **Markets** (`src/markets/`): screens see lending protocols only through
  `types.ts` (`LendingMarketAdapter`, markets, reserves, snapshots).
  `aaveV3/registry.ts` holds the Aave V3 Pool, data provider and oracle for
  Base and Arbitrum (checked against `@bgd-labs/aave-address-book`), and
  `aaveV3/clients.ts` one viem public client per chain. Their RPCs are
  `VITE_RPC_URL_BASE` and `VITE_RPC_URL_ARB`; unset, they default to
  `https://base-rpc.publicnode.com` and
  `https://arbitrum-one-rpc.publicnode.com`, which may rate-limit, so set
  your own for production. `math.ts` holds the loan math (LTV, health
  factor, liquidation price, max borrow) in bigint, rounded against the
  borrower. `aaveV3/supported.ts` keeps only the reserves 1Click can deliver:
  the `listSupportedTokens('inOperation')` destinations on the market's
  chain, matched by contract address (WETH also counts when only native ETH
  is listed). `MarketAdaptersProvider` (mounted in `App.tsx`) holds the
  adapter list, and `useMarketSnapshots` reads each market in its own query,
  so one chain failing leaves the other in place; `format.ts` formats APR,
  LTVs and compact dollars. `loan/MarketList.tsx` shows one card per market
  (`layout` is `cards` or `table`) for the `pair` it is given (the loan
  form's collateral and borrow symbols), with BEST on the lowest borrow APR,
  a skeleton per market while loading and a "Try again" Banner per failed
  market; the form passes its selected market and takes the user's pick.
  The rows and BEST come from `loan/marketRows.ts`, which the loan form
  shares.
- **Funding assets** (`src/balances/`): `useFundingAssets` turns the SDK's
  `useWalletBalances` and `useSupportedTokens` into the rows the Supply
  picker lists: non-zero wallet balances, highest USD value first, a token
  Intents Connect cannot start from marked unavailable, and the chains that
  could not be read. Two price sources, on purpose: held assets are priced
  by 1Click (an arbitrary token has no oracle price), the loan figures by the
  market's Aave oracle (what the Pool enforces). Wallet balances only, not
  the NEAR Intents account.
- **Loan form** (`src/loan/NewLoanForm.tsx`, `src/loan/useLoanForm.ts`):
  `useLoanForm` holds the form's state (funding asset, amount, borrow asset,
  LTV, picked market, recipient) and derives the pair, the selected market
  and the figures through the model below. The Supply card picks a wallet
  balance (group and chain filter chips; a skeleton while loading; a
  "Try again" Banner when balances or some chains fail) and takes the
  amount with its "≈ $" value; an asset no market takes as collateral is
  "Supplied as WETH". The Borrow card picks a borrowable reserve (never the
  collateral's own symbol) and shows the read-only amount received after
  the fee; the fee row is 0.30% of the borrow amount, an estimate until a
  quote. Disconnected, the pickers show WETH / USDC and no balances.
- **Loan form model** (`src/loan/model/`): pure, bigint, no React. The LTV
  zones (`zones.ts`), the borrow amount, fee (`BORROW_FEE_BPS` in
  `config.ts`), received amount, health and liquidation price
  (`loanFigures.ts`), the collateral a held asset is supplied as
  (`collateral.ts`), which markets fit the LTV and which is BEST
  (`marketFit.ts`), the call-to-action state (`ctaState.ts`) and the
  recipient check (`recipient.ts`). `useLoanForm` derives the form's
  figures through it.
- **Vercel routing**: catch-all files in `api/` are not reliably routed
  outside Next.js, so `vercel.json` rewrites `/api/intents-connect/:path*`
  to `/api/intents-connect?path=:path*`, and the function restores the
  original path before the handler checks it. Keep that rewrite (first) when
  the deployment adds the SPA rewrite to `index.html`, and check on a preview
  deploy that `POST /api/intents-connect/api/v1/executions/0xabc/steps`
  reaches the function.

Designs: `.dotsso/inputs/lane/easy-borrow-borrow` (`Web-Borrow` and `Web-Borrow-NotConnected`
at 1280, `Mob-Borrow` and `Mob-Borrow-NotConnected` at 420).
