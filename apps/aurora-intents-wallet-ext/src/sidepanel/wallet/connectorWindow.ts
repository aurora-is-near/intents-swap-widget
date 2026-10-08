import { pingPage } from './createPageProvider';

export const CONNECTOR_URL = __CONNECTOR_URL__;

const CONNECTOR_MATCH = `${new URL(CONNECTOR_URL).origin}/*`;

/** How long a freshly opened window gets to load its bridge. */
const OPEN_TIMEOUT_MS = 15_000;
const POLL_MS = 250;

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isBridgeUp = async (tabId: number) => {
  try {
    await pingPage(tabId);

    return true;
  } catch {
    return false;
  }
};

const findConnectorTab = async () => {
  const [tab] = await chrome.tabs.query({ url: CONNECTOR_MATCH });

  return tab?.id;
};

const openConnector = async () => {
  const existing = await findConnectorTab();

  if (existing !== undefined && (await isBridgeUp(existing))) {
    return existing;
  }

  let tabId = existing;

  if (tabId === undefined) {
    // Unfocused: the side panel stays the UI; wallet prompts still pop up.
    const created = await chrome.windows.create({
      url: CONNECTOR_URL,
      type: 'popup',
      width: 360,
      height: 420,
      focused: false,
    });

    tabId = created?.tabs?.[0]?.id;
  }

  if (tabId === undefined) {
    throw new Error('Could not open the Aurora Intents wallet window');
  }

  const deadline = Date.now() + OPEN_TIMEOUT_MS;

  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop -- polling, one probe at a time
    if (await isBridgeUp(tabId)) {
      return tabId;
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(POLL_MS);
  }

  throw new Error(
    `The Aurora Intents wallet window did not load (${CONNECTOR_URL})`,
  );
};

let opening: Promise<number> | null = null;

/**
 * The tab of the extension's own wallet page, opening it in a small popup
 * window when it isn't open. Wallets connected in the extension live on that
 * page's origin, so every request for them is served there.
 */
export const ensureConnectorTab = () => {
  opening ??= openConnector().finally(() => {
    opening = null;
  });

  return opening;
};

/**
 * Closes the connector window once nothing needs it. Safe to call when it is
 * not open; a later wallet request simply opens it again.
 */
export const closeConnector = async () => {
  // Let an in-progress open settle, so its window doesn't outlive the close.
  await opening?.catch(() => undefined);

  const tabs = await chrome.tabs.query({ url: CONNECTOR_MATCH });
  const ids = tabs.flatMap((tab) => (tab.id === undefined ? [] : [tab.id]));

  if (ids.length > 0) {
    await chrome.tabs.remove(ids).catch(() => undefined);
  }
};
