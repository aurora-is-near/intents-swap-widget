/**
 * The toolbar button: opens the modal on the current tab, and the theme
 * inspector. On a site the content script doesn't run on
 * (anything but app.aave.com), it injects it first, as a theme preview.
 * `activeTab` grants the tab for that click only.
 *
 * Self-contained: vite.config.ts compiles this one file, with no bundling,
 * into dist/background.js. Functions passed to `executeScript` run in the
 * page, so they can't use anything from this scope.
 */

type AuroraGlobal = Window & {
  auroraIntents?: {
    preview?: boolean;
    open?: () => void;
    theme?: { inspect: () => void };
  };
};

const inPage = async <T>(tabId: number, func: () => T): Promise<T> => {
  const [frame] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func,
  });

  return frame?.result as T;
};

const openOn = async (tabId: number) => {
  const loaded = await inPage(
    tabId,
    () => typeof (window as AuroraGlobal).auroraIntents?.open === 'function',
  );

  if (!loaded) {
    await inPage(tabId, () => {
      const page = window as AuroraGlobal;

      page.auroraIntents = { ...page.auroraIntents, preview: true };
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      files: ['content.js'],
    });
  }

  await inPage(tabId, () => {
    const page = window as AuroraGlobal;

    page.auroraIntents?.open?.();
    page.auroraIntents?.theme?.inspect();
  });
};

chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) {
    return;
  }

  const tabId = tab.id;

  openOn(tabId).catch(() => {
    // chrome:// pages, the Web Store, PDFs…: Chrome doesn't let us in.
    void chrome.action.setBadgeText({ tabId, text: '!' });
    void chrome.action.setTitle({
      tabId,
      title: "Aurora Intents can't run on this page",
    });
  });
});
