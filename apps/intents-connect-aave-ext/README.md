# Aurora Intents for Aave (dev extension)

An internal Chrome extension, not for customers. It adds **Supply with
Aurora** to app.aave.com's "Assets to supply" header. The button opens a modal
that lets a user pay from any wallet, on any chain, into the Aave position of
the account connected on the page, through Intents Connect.

It stands in for a real integration. `src/ui/` is the future UI package:
everything it knows about the page and about Aave comes in through props.

```
src/content/   MAIN-world entry: the button and the modal host
src/page/      app.aave.com adapter: the button, the account (wagmi.store), the market
src/aave/      Aave logic: markets (and, later, reserves and the supply recipe)
src/ui/        the modal, rendered in a shadow root
```

## Run it

```bash
# Node 22, from the repo root
yarn workspace intents-connect-aave-ext build   # or `dev` to rebuild on change
```

Then, in Chrome:

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose `apps/intents-connect-aave-ext/dist`.
3. Open https://app.aave.com and connect a wallet. The button shows up in
   the "Assets to supply" header.

After a rebuild, click the extension's reload icon in `chrome://extensions`,
then reload the Aave tab.
