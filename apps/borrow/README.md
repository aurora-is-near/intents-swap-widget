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
  loan tab, `/positions` is My positions; any other path redirects to `/`.
  Path routes need an SPA rewrite to `index.html` when deployed.
- **Shell** (`src/shell/`): the page column, header (logo, the Borrow
  section, theme toggle, wallet slot), hero and the route-driven tabs.
- **Theme**: `ThemeProvider` from the kit wraps the router.
  `plugins/themeInitScript.ts` inlines the kit's `getThemeInitScript()` in
  `<head>`, with the same storage key (`src/theme.ts`), so a stored choice
  applies before React mounts.
- **CSS** (`src/index.css`): Tailwind, then the kit's stylesheet. `#root`
  has `isolation: isolate`, so the kit's portalled popups stack above the
  app. The `mobile:` variant is the artboards' `max-width: 640px` block.
- **Intents Connect** (`src/config.ts`, `src/wallet/`): one API client with
  no key; `IntentsConnectProvider` gets it and the AppKit wallet (`null`
  while disconnected), under a `QueryClientProvider`.
- **API-key proxy** (`server/intentsConnectProxy.ts`): the SDK's two create
  calls (`POST api/v1/executions/:wallet` and `…/:wallet/steps`) go to
  `/api/intents-connect`, which adds `x-api-key` from the server-only
  `INTENTS_CONNECT_API_KEY` and forwards them; any other path or method is
  refused. `plugins/intentsConnectProxy.ts` mounts it in `vite dev` and
  `vite preview`, and the Vercel Edge Function `api/intents-connect.ts` in
  production. Put the key in `.env.local` (see `.env.example`); never prefix
  it with `VITE_`.
- **Vercel routing**: catch-all files in `api/` are not reliably routed
  outside Next.js, so `vercel.json` rewrites `/api/intents-connect/:path*`
  to `/api/intents-connect?path=:path*`, and the function restores the
  original path before the handler checks it. Keep that rewrite (first) when
  the deployment adds the SPA rewrite to `index.html`, and check on a preview
  deploy that `POST /api/intents-connect/api/v1/executions/0xabc/steps`
  reaches the function.

Designs: `.dotsso/inputs/lane/easy-borrow-borrow` (`Web-Borrow-NotConnected`
at 1280, `Mob-Borrow-NotConnected` at 420).
