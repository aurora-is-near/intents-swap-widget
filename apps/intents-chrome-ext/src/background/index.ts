// Clicking the toolbar icon opens the side panel. A popup would close as soon
// as the wallet's confirmation window takes focus, killing the flow mid-sign.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  // eslint-disable-next-line no-console
  .catch((error: unknown) => console.error(error));
