/**
 * app.aave.com (MAIN world): the "Supply with Aurora" button in the
 * dashboard's "Assets to supply" header, and what the page knows about the
 * user — the account it is connected with and the market it shows.
 *
 * Aave is a Next.js app that re-renders freely, so the button is (re)inserted
 * from a MutationObserver and found again by its data attribute rather than
 * kept by reference.
 */

import {
  pageHints,
  resolveTheme,
  safeReadPageTheme,
  type SupplyTheme,
} from '../ui/theme';

const ATTR = 'data-aurora-supply';
const LABEL = 'Supply with Aurora';
const TITLE = /^assets to supply$/i;
const DEFAULT_MARKET = 'proto_mainnet_v3';

const MARK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 3.5 20h3.6L12 10.2 16.9 20h3.6L12 3Z" fill="currentColor"/></svg>`;

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/**
 * How the modal (and the button) take Aave's look: the reader finds MUI's
 * papers and buttons, and the corners are pinned to Aave's own dialogs
 * (12 px; its cards are 10).
 */
export const AAVE_THEME: SupplyTheme = {
  auto: {
    selectors: { card: '.MuiPaper-root', button: '.MuiButton-root' },
    pin: { cardRadius: 12 },
  },
};

type ButtonColors = { cta: string; ctaHover: string; ctaText: string };

/** The CTA colors of the theme, read from the page as the modal will. */
const buttonColors = (theme: SupplyTheme | undefined): ButtonColors => {
  const hints = pageHints(theme);
  const { cta, ctaHover, ctaText } = resolveTheme(
    theme,
    hints ? safeReadPageTheme(hints)?.seed : undefined,
  );

  return { cta, ctaHover, ctaText };
};

export type AaveAccount = {
  address: string;
  /** The chain the page's wallet is on — not necessarily the market's. */
  chainId?: number;
  walletName?: string;
};

/** The header title, an MUI Typography holding exactly that text. */
const findTitle = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (TITLE.test(node.nodeValue?.trim() ?? '')) {
      return node.parentElement;
    }
  }

  return null;
};

const createButton = (
  reference: HTMLElement,
  onClick: () => void,
  colors: ButtonColors,
) => {
  const style = getComputedStyle(reference);
  const button = document.createElement('button');

  button.type = 'button';
  button.setAttribute(ATTR, '');
  // Ours: the page-theme reader skips it.
  button.setAttribute('data-aurora-intents', '');
  button.innerHTML = `${MARK}<span>${LABEL}</span>`;

  Object.assign(button.style, {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    boxSizing: 'border-box',
    height: style.height || '36px',
    padding: style.padding || '0 14px',
    // Pushed against "All Categories": the row spaces its items apart.
    margin: '0 8px 0 auto',
    borderRadius: style.borderRadius || '8px',
    border: 'none',
    // The theme's CTA: on Aave, its own black primary with a near-white label.
    background: colors.cta,
    color: colors.ctaText,
    font: style.font || '500 14px/20px Inter, Arial, sans-serif',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    flexShrink: '0',
    transition: 'background 120ms ease',
  });

  button.addEventListener('mouseenter', () => {
    button.style.background = colors.ctaHover;
  });
  button.addEventListener('mouseleave', () => {
    button.style.background = colors.cta;
  });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });

  return button;
};

/** Before "All Categories", in the row it shares with the title. */
const placeButton = (onClick: () => void, theme: SupplyTheme | undefined) => {
  if (document.querySelector(`[${ATTR}]`)) {
    return;
  }

  const title = findTitle();
  const categories = title?.parentElement?.querySelector('button');

  if (title && categories) {
    categories.before(createButton(categories, onClick, buttonColors(theme)));
  }
};

/**
 * Keeps the button in place for the page's lifetime: Aave drops the whole
 * block when the wallet disconnects and re-renders it on navigation.
 */
export const mountSupplyButton = (onClick: () => void, theme?: SupplyTheme) => {
  let scheduled = false;

  // A timer, not requestAnimationFrame: frames don't run in a background
  // tab, and the page renders the block there too.
  const schedule = () => {
    if (!scheduled) {
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        placeButton(onClick, theme);
      }, 100);
    }
  };

  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
  });
  window.addEventListener('popstate', schedule);
  schedule();
};

const readStorage = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

type WagmiConnection = {
  accounts?: string[];
  chainId?: number;
  connector?: { name?: string };
};

type WagmiStore = {
  state?: {
    current?: string | null;
    connections?: { value?: [string, WagmiConnection][] };
  };
};

/**
 * The account Aave is connected with, from wagmi's persisted store (a
 * serialized Map of connections plus the current one). Never asks the wallet.
 */
export const readAaveAccount = (): AaveAccount | null => {
  const raw = readStorage('wagmi.store');

  if (!raw) {
    return null;
  }

  try {
    const { state } = JSON.parse(raw) as WagmiStore;
    const connection = state?.connections?.value?.find(
      ([uid]) => uid === state.current,
    )?.[1];

    const address = connection?.accounts?.[0];

    return address && EVM_ADDRESS.test(address)
      ? {
          address,
          chainId: connection.chainId,
          walletName: connection.connector?.name,
        }
      : null;
  } catch {
    return null;
  }
};

/** The market the page shows: the URL wins, as it does for Aave itself. */
export const readAaveMarket = () =>
  new URLSearchParams(window.location.search).get('marketName') ??
  readStorage('selectedMarket') ??
  DEFAULT_MARKET;
