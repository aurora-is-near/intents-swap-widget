# @aurora-is-near/intents-connect-actions

Private workspace package holding the Intents Connect actions built in this monorepo. Today that is one action, `aave-v3-borrow` version 1 (Aave V3 supply and borrow on Base and Arbitrum), in `actions/aave-v3-borrow-v1/`:

- `definition.json`, `meta.json`, `script.star`, `README.md` and `tests/` fixtures: the action as the actions repo expects it. See the action's own [README](actions/aave-v3-borrow-v1/README.md) for inputs and tables.
- `src/aaveBorrow/`: the tables (`constants.ts`) and the TypeScript twin of the script (`resolve.ts`). The Borrow app builds its steps from them.
- `src/sdk.ts` (`@aurora-is-near/intents-connect-actions/sdk`): the recipe wrapper that uses the Intents Connect SDK.

## Commands

Run them from the repository root, on Node 22, after building the workspace packages (`npx turbo run build --filter='@aurora-is-near/intents-connect-actions^...'`).

```sh
yarn workspace @aurora-is-near/intents-connect-actions test
yarn workspace @aurora-is-near/intents-connect-actions typecheck
yarn workspace @aurora-is-near/intents-connect-actions lint
```

### Dry-run check

`src/aaveBorrow/dryRun.test.ts` posts one dry bridge-in execution per chain and collateral in the tables to `POST /api/v1/executions/{wallet}` and asserts a quote comes back. It proves each 1Click asset id. It is skipped when `INTENTS_CONNECT_API_KEY` is unset, so the default run stays offline.

```sh
INTENTS_CONNECT_API_KEY=<your key> \
  yarn workspace @aurora-is-near/intents-connect-actions test dryRun
```

The key is read from the environment only. The test never logs it, writes it to a file or puts it in an error message; keep it that way when you change the test. `INTENTS_CONNECT_API_URL` overrides the API base URL (default `https://intents-connect-api.aurora.dev`). Each case prints one JSON line (chain, collateral, status, quote, network fee) without the key: paste those lines into the PR body. A collateral that fails to quote must be dropped from the tables, which makes the Borrow app show it as "Coming soon".

### Open follow-up: the dry run has not been run yet

No API key was available when the action was built, so the dry-run check above has never run against the API. The 1Click asset ids in `constants.ts` and `script.star` were checked against the token list only, and whether 1Click delivers cbBTC on Base is still unproven. The API may also reject a dry bridge-in whose steps carry `{MIN_AMOUNT_OUT}`; if it does, change the test to send empty steps. Before the action is deployed, a person with a key runs the check and pastes the five JSON lines into the PR. If an entry fails to quote, drop it from `constants.ts`, `script.star`, the `collateral` enum in `definition.json` and the action README's tables.

## Hand-over to the actions repo

A person copies the action after the feature is merged:

1. Copy `actions/aave-v3-borrow-v1/` into the actions repo's `actions/` directory. The copy must be byte-exact: the action hash covers the exact bytes of `definition.json` and `script.star`, so do not run a formatter on them, and check line endings and the trailing newline.
2. In the actions repo, run `go test ./...`. Its `fixtures_test.go` runs `script.star` on every fixture in `tests/`, which proves the script after the copy.
3. Deploy the actions repo as it documents. Updating the catalog needs a backend rebuild and deployment.
