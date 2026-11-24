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
  redirects to `/`. Below the kit's gallery, "Borrow dialogs" opens the
  confirm, pending and done dialogs with sample figures, to compare with the
  artboards (a pending one turns into done after a few seconds).
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
  collateral's own symbol) and shows the read-only amount received, the
  whole borrow amount, borrowed against the collateral less the fee; the fee
  row is 0.30% of the collateral, an estimate, since the dry run reports the
  fee in the bridged collateral. Disconnected,
  the pickers show WETH / USDC and no balances.
- **Borrow dialogs** (`src/loan/NewLoanPage.tsx`,
  `src/loan/execution/BorrowDialog.tsx`): the ready call to action starts
  `useBorrowFlow`, which previews the loan; the confirm dialog shows the dry
  run's rows (and the rate and minimum received when the paid token is
  converted), the pending dialog follows the runner through three steps and
  cannot be closed, and done's "View position" goes to `/positions`. See
  "The borrow flow" below.
- **Loan form model** (`src/loan/model/`): pure, bigint, no React. The LTV
  zones (`zones.ts`), the borrow amount, the fee on the collateral
  (`BORROW_FEE_BPS` in `config.ts`), health and liquidation price
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

## The borrow flow

`src/loan/execution/`. One Aave V3 borrow is one Intents Connect bridge-in
execution: the user's funds are bridged into the collateral on the market's
chain, where the execution's intermediary runs the steps.

1. **Preview** (`useBorrowFlow().start`, `preview.ts`). Pre-checks first:
   enough of the paying chain's gas token for the deposit (from the funding
   rows). Then a dry run in two passes, because the borrow amount is a
   literal in the steps: the first pass quotes the collateral's
   `minAmountOut`, the borrow amount is sized against that minimum at the
   chosen LTV and the market's oracle prices (`model/loanFigures.ts`), and
   the second pass previews the final plan (`plan.ts`, 1% slippage). The
   market is then read again: if it can't lend that much
   (`liquidity.ts`), the flow goes straight to the no-liquidity error.
2. **Confirm** (`BorrowDialog`). The rows come from the final dry run
   (`previewFigures.ts`): the collateral expected and, when the paid token
   is converted, the rate and minimum received; the borrow; the fee exactly
   as the dry run reports it (`details.networkFee`, in the collateral, so
   the borrow arrives whole); LTV against the minimum received; recipient.
   "Confirm in wallet" runs that preview's plan as it is (`run(plan)`
   reuses its prepared steps).
3. **Sign** (pending step 1, "Sign and deposit"). The runner creates the
   execution (the `created` event; see restore below) and asks the wallet
   to sign the intent.
4. **Deposit** (still pending step 1). An EVM origin then sends the deposit transaction from the
   wallet: this is where "not enough gas" arises.
5. **Steps** (pending step 2, "Bridge the collateral", then step 3, "Open
   the loan and deliver …"). Once the collateral arrives, the
   intermediary runs the recipe's steps (`recipe.ts`,
   `markets/aaveV3/steps.ts`): approve and `supply` (or the WETH gateway's
   `depositETH` for native ETH), `borrow` at variable rate, and `transfer`
   of the borrowed tokens to the recipient (the connected wallet unless
   another address was given; required for a non-EVM wallet). The service
   appends its own fee step. `SUCCESS` opens "Loan opened".

**The position is owned by the intermediary**, not the user's wallet:
Aave lets an account borrow only on its own collateral, so the account
that supplies and borrows is the execution's intermediary. The position is
therefore not visible under the user's address in Aave's own app; My
positions is where Borrow will show it (its content is a later feature).

The fee is the API key's fee configuration in Intents Connect, charged on
the bridged collateral; it is never one of the recipe's steps. The form's
0.30% fee row (`BORROW_FEE_BPS`) is an estimate until the dry run.

### Errors and recovery

`classifyBorrowError.ts` turns a failure into one of the error dialogs
(copy in `errorCopy.ts`, from the artboards' error table), each with one
recovery action:

| Error | When | Action |
|---|---|---|
| Signature rejected | The wallet declined | Try again: previews afresh, then runs |
| Not enough for the network fee | Gas pre-check, or the wallet's insufficient-funds error | Try again; after a failed deposit transfer, only the transfer is prompted again (`retryDeposit`) |
| Collateral price moved | The quote moved, or the borrow step failed over the max LTV | Refresh quote: back to confirm |
| Not enough to borrow in the market | Liquidity pre-check, or the borrow step failed for liquidity | Choose another market: closes to the form |
| Taking longer than usual | Pending over 5 minutes, or polling timed out | Close and keep tracking: the borrow stays tracked |
| A borrow from this wallet is already running / was never signed / is waiting for its deposit (`inFlight`) | Another execution holds the wallet's in-flight lock: the SDK's `EXECUTION_IN_FLIGHT` guard, or a `resume-or-cancel` recovery | Resume, Cancel it, or Close |
| The transfer didn't go through (`transferFailed`) | The signed borrow's deposit transfer failed, not by a rejection or for gas (a `retry-transfer` recovery, a `DepositTransferError`) | Retry transfer (`retryDeposit()`), or Cancel the borrow |

- Leaving a created execution that was never signed cancels it, so it does
  not hold the wallet's in-flight lock.
- A wallet that disconnects mid-borrow gets "Reconnect wallet": a signed
  execution is resumed from the new connection, an unsigned one re-quoted.
- If the borrow step fails after the collateral arrived
  (`OPERATION_FAILED`), the collateral waits at the intermediary. The error
  dialog says so and shows the execution id in full, and its action is
  "Try again": a steps-only retry (`stepsRetry.ts`), never a new bridge-in.
  It reads the market afresh and the collateral waiting at the
  intermediary (`getIntermediaryBalance`), re-sizes the borrow at the
  chosen LTV with two `previewSteps()` dry runs (the fee is carved from the
  collateral, `feeFromAmount`), and goes back to confirm with the new
  figures; confirming runs it with `runSteps()`. Until the user leaves,
  every retry stays steps-only. With nothing waiting any more (the supply
  went through and only the borrow failed), or for a restored borrow
  (no form to size it from), only Close is offered.
- After Close, or a reload, nothing in the app lists the waiting
  collateral yet; the execution id in the dialog is how to find it.

#### The wallet's in-flight lock

The backend holds one in-flight lock per (intermediary, chain): while
another execution of the wallet is open (a failed one, or one never
signed), a new borrow's create is refused by the SDK's
`EXECUTION_IN_FLIGHT` guard. `useBorrowFlow` shows it as the `inFlight`
dialog, with the execution that holds the lock (`lock`: its id, from the
guard or the recovery). It looks that execution up in the wallet's
in-flight list (`useRestoreBorrow`'s `findExecution`) to tell whose it is
and where it is:

- One of this app's borrows (`metadata.intent` is `aave_borrow`): the
  title says it is running, was never signed (`CREATED` without
  `details.messageSigned`) or is waiting for its deposit (`DEPOSIT_PENDING`,
  the deposit not known to be sent). **Resume** (`resumeExisting()`)
  follows it as a restore does, with its kept rows (or generic ones): to
  `pending`, to `signing` (the wallet asks for the signature), or, signed
  and unfunded, straight to the deposit transfer with `depositViaWallet`
  when its token was kept (else the deposit address).
- Another app's run (or one that could not be read): the copy says so, and
  only Cancel it and Close are offered; it can't be followed here.
- **Cancel it** (`cancelExisting()`) signs the execution's cancellation (the
  button reads "Sign to cancel…" meanwhile), forgets its kept record, then
  goes back to confirm with a fresh quote; without a form input (found on
  load) it closes. A refused cancel keeps the dialog.
- Both this dialog and the failed transfer's show the execution id in full,
  with a copy button.

A signed borrow whose deposit transfer failed for any other reason than a
rejection or gas is `transferFailed`: **Retry transfer** (`retryTransfer()`)
prompts only the transfer again (`retryDeposit()`); **Cancel the borrow**
cancels the execution and closes.

### Restore after a reload

- On `created`, `NewLoanPage` keeps a record in `localStorage` under one
  key, `aurora-borrow-pending`, per wallet address
  (`pendingBorrowStore.ts`): the execution id, the confirm dialog's rows
  and the token the deposit is paid in (chain, contract, decimals). The
  runner's `deposit-sent` marks it `depositSent`. It is cleared on a
  terminal status (`SUCCESS`, `DEPOSIT_FAILED`, `OPERATION_FAILED`) or a
  cancel. Malformed stored data is ignored.
- On mount with a connected wallet, `useRestoreBorrow` looks once for the
  wallet's in-flight executions (`useWalletExecutions` with
  `IN_FLIGHT_STATUSES`) and takes the one whose `metadata.intent` is
  `aave_borrow` (`AAVE_BORROW_INTENT`), else another app's (it holds the
  same lock). A borrow past its signature and deposit is restored:
  `useBorrowFlow().restore` calls `resume(executionId)` and reopens the
  pending dialog at the execution's step.
- One that still needs the user is never resumed unasked, since resuming
  could open the wallet (as the Aave extension's in-flight check): a borrow
  never signed (`CREATED` without `details.messageSigned`), a signed
  `DEPOSIT_PENDING` borrow whose deposit is not known to be sent, and
  another app's run. `useBorrowFlow().offerResume` shows the `inFlight`
  dialog instead ("…was never signed", "…is waiting for its deposit", or
  another app's, see above); nothing is prompted until Resume or Cancel.
- On Resume, a signed `DEPOSIT_PENDING` borrow whose deposit is not known
  to be sent is not resumed plainly either: across sessions the runner
  can't tell a deposit never sent from one not yet seen, so it would only
  surface the address and no wallet prompt would come. With the token kept,
  Resume sends it at once (`depositViaWallet: true` with the kept token,
  `ResumeDepositOptions`). Without it, the dialog shows the deposit address
  while the runner watches for a deposit; it can be closed, and the borrow
  is offered again on the next visit. A deposit marked sent resumes past
  the deposit step. A reconnect after the signature but before the deposit
  offers "Send deposit" the same way.
- A restored borrow never has a form input: a retry that would quote again
  closes it instead of quoting an earlier borrow's input.
- The dialog shows the kept rows when the record is this execution's.
  Without one (another browser, cleared storage) it shows generic rows from
  the execution: the paid and supplied values in dollars, its status and
  id. A record no in-flight borrow matches is dropped.

### Open

- Funding with the collateral asset already on the market's chain (WETH on
  Base into the Base market) may not be quotable as a bridge-in. The plan
  review's answer: use the bridge-in if it quotes, otherwise disable that
  funding row with a reason. Not known until the maintainer's Base run;
  until then, a refused quote shows "Something went wrong".

### Environment

The borrow needs, besides the wallet's `VITE_REOWN_PROJECT_ID`:

- `INTENTS_CONNECT_API_KEY` (server-only, never `VITE_`): the proxy adds it
  to the two create calls. Without it every borrow fails at creation. Its
  fee configuration is the borrow fee.
- `VITE_INTENTS_CONNECT_API_URL` (optional, public) and
  `INTENTS_CONNECT_API_URL` (optional, the proxy's target);
  `VITE_INTENTS_CONNECT_API_KEY_PROXY_URL` (default `/api/intents-connect`).
- `VITE_INTENTS_API_KEY` (required, public): balances and the token list.
- `VITE_RPC_URL_BASE`, `VITE_RPC_URL_ARB`: the market reads, including the
  liquidity pre-check and the failed-step diagnosis.

See `.env.example` for each.

Designs: `.dotsso/inputs/lane/easy-borrow-borrow` (`Web-Borrow` and `Web-Borrow-NotConnected`
at 1280, `Mob-Borrow` and `Mob-Borrow-NotConnected` at 420).
