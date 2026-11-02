import { APP_LAUNCH_KEY, CHANNEL } from '../shared/bridge';
import type { AppLaunch, OpenAppMessage } from '../shared/bridge';

// Clicking the toolbar icon opens the side panel. A popup would close as soon
// as the wallet's confirmation window takes focus, killing the flow mid-sign.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  // eslint-disable-next-line no-console
  .catch((error: unknown) => console.error(error));

const isOpenApp = (message: unknown): message is OpenAppMessage =>
  typeof message === 'object' &&
  message !== null &&
  (message as { channel?: unknown }).channel === CHANNEL &&
  (message as { type?: unknown }).type === 'open-app';

/**
 * A site's "Deposit with Aurora" button: open the panel on that tab and leave
 * it the app to show. `sidePanel.open` must run within the click's user
 * gesture, so it goes first, before anything is awaited.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (sender.id !== chrome.runtime.id || !isOpenApp(message) || !tabId) {
    return false;
  }

  const opening = chrome.sidePanel.open({ tabId });

  const launch: AppLaunch = {
    app: message.app,
    tabId,
    account: message.account,
    at: Date.now(),
  };

  void chrome.storage.session.set({ [APP_LAUNCH_KEY]: launch });

  opening.then(
    () => sendResponse({ ok: true }),
    (error: unknown) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
  );

  // Answered asynchronously.
  return true;
});
