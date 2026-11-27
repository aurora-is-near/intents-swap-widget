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
  `index.html` when deployed: `vercel.json` rewrites every path but
  `/storybook/` to it.
- **Storybook** (`/storybook` on the deployed site): the kit's design system
  and components, and Borrow's own stories (`*.stories.tsx` under `src/`,
  titled "Borrow/…", such as every borrow dialog state). Its config is the
  kit's (`packages/ui-kit/.storybook`); `yarn build` here runs `vite build`
  and then builds Storybook into `dist/storybook`
  (`yarn build:storybook`), so it ships with the site. Locally:
  `yarn workspace @aurora-is-near/ui-kit storybook` (port 6006; Node
  20.19+).
- **Shell** (`src/shell/`): the page column, header (logo, the Borrow
  section, theme toggle, wallet button), hero, the route-driven tabs and the
  reduced footer (logo, tagline and copyright; dark in both themes).
- **Tab panels**: New loan shows `src/domains/loan/components/NewLoanForm/NewLoanForm.tsx`, the
  artboard's two columns: the loan form beside the live market list
  (`src/domains/loan/components/MarketList/MarketList.tsx`), the LTV / Liquidation / Health tiles and,
  disconnected, the working "Connect wallet to borrow on Aave" CTA. My
  positions shows
  `src/domains/positions/PositionsEmptyState.tsx`: "Connect wallet" when
  disconnected, "No positions right now" with "Make a loan" when connected.
- **Wallet** (`src/domains/wallet/`): EVM, Solana, NEAR and Stellar wallets,
  one connected at a time. `providers/WalletProvider.tsx` mounts Reown
  AppKit (EVM and Solana) inside `ThemeProvider`, keeping AppKit's modal in
  step with the kit's theme, and `providers/WalletSessionProvider.tsx`
  inside it. The session runs the wallet package's connectors (AppKit,
  near-connect, Stellar Wallets Kit) behind its `useWalletSelector`, and
  renders the package's `WalletSelectorModal` with Borrow's theme
  (`walletModalTheme.ts`: kit CSS variables, so it follows light and dark).
  Picking a row opens that family's own modal. Components read the
  connection through `hooks/useWallet.ts`: address, family, the Intents
  Connect wallet, `connect()` (resolves once connected, rejects when the
  modal is closed) and `disconnect()`. Set `VITE_REOWN_PROJECT_ID` to
  Borrow's own Reown project in production; unset, AppKit falls back to the
  wallet package's shared Aurora id. `components/WalletButton/WalletButton.tsx`
  in the header connects, and when connected shows the short address and
  disconnects on click.
- **Theme**: `ThemeProvider` from the kit wraps the router.
  `vite-plugins/themeInitScript.ts` inlines the kit's `getThemeInitScript()` in
  `<head>`, with the same storage key (`src/constants.ts`), so the stored
  choice, or else the system theme, applies before React mounts.
- **CSS** (`src/index.css`): Tailwind, the kit's stylesheet (with the
  `mobile:` variant, the artboards' `max-width: 640px` block), then
  `src/theme.css`: Borrow's colours with no theme pair (the dark footer,
  the live dot). `#root` has `isolation: isolate`, so the kit's portalled
  popups stack above the app. Sizes use the
  kit's scale (`text-14`, `rounded-18`, Tailwind's 4px spacing grid), not
  arbitrary values; `yarn fallow` reports any new one.
- **Intents Connect** (`src/config.ts`, `src/domains/wallet/`): one API client,
  keyed with the client-side `VITE_INTENTS_API_KEY` (the SDK adds
  `x-api-key` to its two create calls); `IntentsConnectProvider` gets it and the session's wallet, of
  any family (`null` while disconnected), under a `QueryClientProvider`. `config.ts` also
  builds the intents API client the SDK's balance hooks need, which the
  provider passes on too, with the same key (in the URL path). The key is
  **required** and public; unset, the app logs a configuration error at
  start-up, no balances load and every borrow fails at creation.
- **Markets** (`src/domains/markets/`): screens see lending protocols only through
  `types.ts` (`LendingMarketAdapter`, markets, reserves, snapshots).
  `aaveV3/config/registry.ts` holds the Aave V3 Pool, data provider and oracle for
  Base and Arbitrum (checked against `@bgd-labs/aave-address-book`), and
  `aaveV3/config/clients.ts` one viem public client per chain. Their RPCs are
  `VITE_RPC_URL_BASE` and `VITE_RPC_URL_ARB`; unset, they default to
  `https://base-rpc.publicnode.com` and
  `https://arbitrum-one-rpc.publicnode.com`, which may rate-limit, so set
  your own for production. `utils/math.ts` holds the loan math (LTV, health
  factor, liquidation price) in bigint, rounded against the
  borrower. `aaveV3/utils/supported.ts` keeps only the reserves 1Click can deliver:
  the `listSupportedTokens('inOperation')` destinations on the market's
  chain, matched by contract address (WETH also counts when only native ETH
  is listed). `providers/MarketAdaptersProvider` (mounted in `App.tsx`) holds the
  adapter list, and `hooks/useMarketSnapshots` reads each market in its own query,
  so one chain failing leaves the other in place; `utils/format.ts` formats APR,
  LTVs and compact dollars. `loan/components/MarketList` shows one card per provider (its chain
  chosen by the lowest APR with the liquidity for the loan) for the `pair`
  it is given (the loan form's collateral and borrow symbols), with BEST on
  the lowest borrow APR when there are two or more providers, a skeleton per
  provider while loading and a "Try again" Banner per failed read; the form
  passes its selected provider and takes the user's pick. The rows and BEST
  come from `loan/model/marketRows.ts`, which the loan form shares.
- **Funding assets** (`src/domains/wallet/hooks/useFundingAssets.ts`,
  `src/utils/toFundingAssets.ts`): `useFundingAssets` turns the SDK's
  `useWalletBalances` and `useSupportedTokens` into the rows the Supply
  picker lists: non-zero wallet balances, highest USD value first, a token
  Intents Connect cannot start from marked unavailable, and the chains that
  could not be read. Two price sources, on purpose: held assets are priced
  by 1Click (an arbitrary token has no oracle price), the loan figures by the
  market's Aave oracle (what the Pool enforces). Wallet balances only, not
  the NEAR Intents account.
- **Loan form** (`src/domains/loan/components/NewLoanForm/NewLoanForm.tsx`, `src/domains/loan/hooks/useLoanForm.ts`):
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
- **Borrow dialogs** (`src/domains/loan/components/NewLoanPage/NewLoanPage.tsx`,
  `src/domains/borrow/components/BorrowDialog/BorrowDialog.tsx`): the ready call to action starts
  `useBorrowFlow`, which previews the loan; the confirm dialog shows the dry
  run's rows (and the rate and minimum received when the paid token is
  converted), the pending dialog follows the runner through three steps and
  cannot be closed, and done's "View position" goes to `/positions`. See
  "The borrow flow" below.
- **Loan form model** (`src/domains/loan/model/`): pure, bigint, no React. The LTV
  zones (`zones.ts`), the borrow amount, the fee on the collateral
  (`BORROW_FEE_BPS` in `config.ts`), health and liquidation price
  (`loanFigures.ts`), the collateral a held asset is supplied as
  (`collateral.ts`), which markets fit the LTV and which is BEST
  (`marketFit.ts`), the call-to-action state (`ctaState.ts`) and the
  recipient check (`recipient.ts`). `useLoanForm` derives the form's
  figures through it.

## The borrow flow

`src/domains/borrow/`. One Aave V3 borrow is one Intents Connect bridge-in
execution: the user's funds are bridged into the collateral on the market's
chain, where the execution's intermediary runs the steps.

Its folders, each with its tests in `__tests__/`: `hooks/` (`useBorrowFlow`,
`useRestoreBorrow`), `flow/` (the state machine), `utils/` (the dry runs,
plan, recipe, steps-only retry, confirm figures and error classification),
`stores/` (`executionProgress` in memory, `pendingBorrowStore` in
`localStorage`) and `components/BorrowDialog/` (the dialogs, their stories and,
in `utils/`, their helpers such as `getErrorCopy`).

1. **Preview** (`useBorrowFlow().start`, `preview.ts`). Pre-checks first:
   enough of the paying chain's gas token for the deposit (from the funding
   rows). Then a dry run in two passes, because the borrow amount is a
   literal in the steps: the first pass quotes the collateral's
   `minAmountOut`, the borrow amount is sized against that minimum at the
   chosen LTV and the market's oracle prices (`domains/loan/model/loanFigures.ts`), and
   the second pass previews the final plan (`plan.ts`, 1% slippage). The
   market is then read again: if it can't lend that much (`checkLiquidity`
   in `utils/classifyBorrowError.ts`), the flow goes straight to the
   no-liquidity error.
2. **Confirm** (`BorrowDialog`). The rows come from the final dry run
   (`previewFigures.ts`): the collateral expected and, when the paid token
   is converted, the rate and minimum received; the borrow; the fee exactly
   as the dry run reports it (`details.networkFee`, in the collateral, so
   the borrow arrives whole); LTV against the minimum received; recipient.
   "Confirm in wallet" runs that preview's plan as it is (`run(plan)`
   reuses its prepared steps).
3. **Sign** (pending step 1, "Sign and deposit"). Before anything is
   created, the wallet's open executions are listed to clear its in-flight
   lock (see "The wallet's in-flight lock" below). The runner then creates
   the execution (the `created` event; see restore below) and asks the
   wallet to sign the intent.
4. **Deposit** (still pending step 1). The wallet then sends the deposit
   transaction on its own chain (EVM, Solana, NEAR or Stellar): this is where
   "not enough gas" arises.
5. **Steps** (pending step 2, "Bridge the collateral", then step 3, "Open
   the loan and deliver …"). Once the collateral arrives, the
   intermediary runs the recipe's steps. The Aave adapter's recipe is the
   hosted `aave-v3-borrow` action (`actionRecipe` from the SDK): each dry run
   and the steps-only retry resolve it on the actions API
   (`VITE_INTENTS_CONNECT_ACTIONS_API_URL`), pinned by version and hash in
   `domains/markets/aaveV3/config/borrowAction.ts`, and each step carries a
   name and a description in its `metadata`. The steps: approve and `supply` (or the WETH gateway's
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
(copy in `BorrowDialog/utils/getErrorCopy.ts`, from the artboards' error table), each with one
recovery action (`borrowRecoveryAction`):

| Error | When | Action |
|---|---|---|
| Signature rejected | The wallet declined the signature (the created execution was cancelled first) | Try again: previews afresh, then runs |
| Deposit not sent | Signed, then the wallet declined the deposit transaction | Send deposit: only the transfer is prompted again (`retryDeposit`) |
| Request still open | The cancellation of an open execution was declined | Confirm cancellation: asks again |
| A borrow is already in progress | An open execution of the wallet is on its way | Close |
| Wallet disconnected | The wallet left mid-borrow (`WALLET_NOT_CONNECTED`, or its runner was disposed) | Reconnect wallet: see below |
| Not enough for the network fee | Gas pre-check, or the wallet's insufficient-funds error | Try again; after a failed deposit transfer, only the transfer is prompted again (`retryDeposit`) |
| Quote changed | The bridge quote moved before signing (`QUOTE_MOVED`) | Refresh quote: back to confirm |
| Collateral price moved | The borrow step failed over the max LTV | Refresh quote (steps-only, see below) |
| Not enough to borrow in the market | Liquidity pre-check, or the borrow step failed for liquidity | Choose another market: closes to the form |
| Taking longer than usual | Pending over 5 minutes, or polling timed out | Close and keep tracking: the borrow stays tracked |

- An error is drawn on the step the borrow had reached, not a fixed one per
  error.
- A wallet that disconnects mid-borrow gets "Reconnect wallet": an
  execution whose deposit left the wallet is resumed from the new
  connection; anything else is re-quoted, or, with the collateral waiting,
  retried steps-only. Any other unexplained error ("Something went wrong")
  only closes.
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

### The wallet's in-flight lock

Intents Connect allows one open execution per wallet, and deleting one
takes a wallet signature (`delete_execution:<id>`). The API's status alone
can't say what happened to one: an unsigned execution may already read
`DEPOSIT_PENDING`. So this session records, in memory only
(`executionProgress.ts`), each execution it created and whether its deposit
left the wallet; after a reload only the API (`messageSigned`) is known.

- **A declined signature** cancels the execution at once. The runner's own
  auto-cancel is off (`autoCancelOnSignatureRejection: false` in
  `IntentsConnectWalletProvider`) so the dialog first says why a second
  prompt opens ("Cancel the unsigned request"). Declining that too shows
  "Request still open", whose button asks again.
- **Clicking Borrow** (and again at Confirm) lists the wallet's open
  executions first. One on its way (`isOngoingExecution`: deposit seen,
  deposit sent this session, or signed with nothing known, as after a
  reload) is shown and tracked instead of quoting a new borrow, with the
  banner "Your previous borrow is still in progress"; that dialog can be
  closed. At Confirm, any other open execution (never signed, or created
  and never funded this session) is cancelled first, with "Cancel your
  earlier request first", then the new one is created.
- **Leaving or closing never prompts the wallet.** An abandoned execution
  stays open until the next borrow cancels it, or it expires with its
  quote (about 10 minutes).

### The flow's state machine

`useBorrowFlow` is glue around a pure state machine in
`src/domains/borrow/flow/`: `transition(state, event, env)` returns the
next state and a list of effects (plain data), which the hook runs; each
effect's result comes back as an event tagged with the run's `attempt`, and
a result for an attempt the user has moved on from is dropped.

| File | What it holds |
|---|---|
| `state.ts` | `BorrowState` (each state carries its `Run`: input, accepted dry run, execution, step, signed, deposit sent, waiting collateral, …) |
| `events.ts` | `BorrowEvent` (user, lock, quote, runner, cancel, timer, wallet), `BorrowEffect`, `FlowEnv` |
| `guards.ts` | `isDeclinedSignature`, `isFundsWaiting`, `intermediaryOf`, `resumeAfterReconnect`, `STATUS_STEP` |
| `transition.ts` | The transition |
| `view.ts` | `viewOf`: the state as `BorrowFlowState`, figures, action, `fundsWaiting` |
| `types.ts` | The public types the dialogs read |

| State | Shown as | Left by |
|---|---|---|
| `idle` | nothing | `START`, `RESTORE` |
| `checking` | previewing, or signing before a run | `OPEN_LISTED`: show the previous borrow, quote, cancel an abandoned one, or run |
| `quoting` | previewing | `QUOTED` → `confirm` (or `checking` to run), `QUOTE_FAILED` → `error` |
| `confirm` | confirm | `CONFIRM` → `checking` |
| `cancelling` | cancelling | `CANCELLED` → its next step, `CANCEL_FAILED` → `cancelDeclined` |
| `signing` | signing | runner events → `tracking`, `RUN_FAILED` → `cancelling` (declined) or `error` |
| `tracking` | pending, or the "taking longer" warning | status `SUCCESS` / `RUN_DONE` → `done`, `RUN_FAILED` → `error` |
| `done` | loan opened | `LEAVE` |
| `error` | the error | `RETRY`, `REFRESH`, `CLOSE`, `RECONNECT` |

The runner's own `error` event is ignored: the rejected run is the one
source of a failure. `executionProgress` records only what this session
did: an execution it created (`created`) and a deposit it saw sent
(`deposit-sent`); one it only follows gets no record until then.

### Restore after a reload

- On `created`, `NewLoanPage` keeps a record in `localStorage` under one
  key, `aurora-borrow-pending`, per wallet address
  (`pendingBorrowStore.ts`): the execution id and the confirm dialog's
  rows, for display only. It is cleared on a terminal status (`SUCCESS`,
  `DEPOSIT_FAILED`, `OPERATION_FAILED`) or a cancel. Malformed stored data
  is ignored.
- On mount with a connected wallet, `useRestoreBorrow` looks once for the
  wallet's in-flight executions (`useWalletExecutions` with
  `IN_FLIGHT_STATUSES`) and takes the one whose `metadata.intent` is
  `aave_borrow` (`AAVE_BORROW_INTENT`) and is on its way
  (`isOngoingExecution`); another app's runs are left alone. An unsigned
  one is never restored: resuming it would prompt the wallet on page load.
  `useBorrowFlow().restore` watches it with a plain `resume(executionId)`,
  which never prompts the wallet for a signed execution it didn't create,
  and reopens the pending dialog at the execution's step.
- A signed `DEPOSIT_PENDING` borrow is treated as a deposit on its way:
  the dialog says it waits for the deposit to arrive. Its arrival moves it
  on. Until it settles or expires, Borrow shows it rather than a new one.
- A restored borrow carries the same "previous borrow" banner, and its
  dialog can be closed.
- A restored borrow never has a form input: a retry that would quote again
  closes it instead of quoting an earlier borrow's input.
- The dialog shows the kept rows when the record is this execution's.
  Without one (another browser, cleared storage) it shows generic rows from
  the execution: the paid and supplied values in dollars and its id (no
  status row: the steps show where it is). A record no in-flight borrow
  matches is dropped.

### Open

- Funding with the collateral asset already on the market's chain (WETH on
  Base into the Base market) may not be quotable as a bridge-in. The plan
  review's answer: use the bridge-in if it quotes, otherwise disable that
  funding row with a reason. Not known until the maintainer's Base run;
  until then, a refused quote shows "Something went wrong".

### Environment

The borrow needs, besides the wallet's `VITE_REOWN_PROJECT_ID` (the EVM /
Solana row of the connect modal; NEAR and Stellar need no configuration):

- `VITE_INTENTS_API_KEY` (required, public, client-side): one key for both
  APIs. The SDK sends it on the two create calls (its fee configuration is
  the borrow fee), and balances and the token list are read with it. Without
  it no balances load and every borrow fails at creation. A build that still
  sets only the old `VITE_INTENTS_CONNECT_API_KEY` or
  `INTENTS_CONNECT_API_KEY` stops with the rename.
- `VITE_INTENTS_CONNECT_API_URL` (optional, public).
- `VITE_INTENTS_CONNECT_ACTIONS_API_URL` (optional, public). The hosted
  actions API the borrow steps are resolved from; the demo deployment
  (`https://intents-connect-actions-demo.aurora.dev`) when unset. Borrow
  pins `aave-v3-borrow` v1 by hash: when the served action changes, its
  reserves show as "Coming soon", a borrow fails with "The borrow action
  changed", and the pin in `config/borrowAction.ts` needs updating (run
  `BORROW_ACTIONS_LIVE=1 yarn test borrowAction.contract`, re-record
  `borrowAction.golden.json`).
- `VITE_RPC_URL_BASE`, `VITE_RPC_URL_ARB`: the market reads, including the
  liquidity pre-check and the failed-step diagnosis.

See `.env.example` for each.

Designs: `.dotsso/inputs/lane/easy-borrow-borrow` (`Web-Borrow` and `Web-Borrow-NotConnected`
at 1280, `Mob-Borrow` and `Mob-Borrow-NotConnected` at 420).
