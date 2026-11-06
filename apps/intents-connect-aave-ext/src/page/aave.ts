/**
 * app.aave.com (MAIN world): the "Supply with Aurora" button in the
 * dashboard's "Assets to supply" header, and what the page knows about the
 * user — the account it is connected with and the market it shows.
 *
 * Aave is a Next.js app that re-renders freely, so the button is (re)inserted
 * from a MutationObserver and found again by its data attribute rather than
 * kept by reference.
 */

import type { SupplyStatus } from '../ui/status';
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

/** Turning on its own (SMIL): no stylesheet on the page to rely on. */
const SPINNER = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-opacity="0.3" stroke-width="2"/><path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.9s" repeatCount="indefinite"/></path></svg>`;
const CHECK = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ALERT = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.75v4M8 11v.25" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`;

const ICONS: Record<SupplyStatus['state'], string> = {
  idle: MARK,
  action: SPINNER,
  running: SPINNER,
  success: CHECK,
  failed: ALERT,
};

/** How long the button says "Supplied" before its own label returns. */
const SUPPLIED_FOR_MS = 10_000;

/** Aave's RPCs can trail the chain: its data is refetched once more after. */
const REFRESH_AGAIN_MS = 6000;

/** The supply's status, as the button shows it (re-applied when it's re-inserted). */
let buttonStatus: SupplyStatus = { state: 'idle' };
// Whether the modal it opens is open: `aria-expanded`.
let modalOpen = false;
let calmTimer: ReturnType<typeof setTimeout> | undefined;

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

/** The button's icon and label for the current status. */
const renderStatus = (button: HTMLButtonElement) => {
  const status = buttonStatus;
  const idle = status.state === 'idle';

  button.innerHTML = `${ICONS[status.state]}<span></span>`;
  button.querySelector('span')!.textContent =
    status.state === 'idle' ? LABEL : status.label;
  button.title = idle ? '' : 'Open the supply';
};

/** The page's button, if it's on the page: focus returns to it on close. */
export const supplyButton = () =>
  document.querySelector<HTMLButtonElement>(`[${ATTR}]`);

/** Tells screen readers whether the dialog the button opens is open. */
export const showSupplyOpen = (open: boolean) => {
  modalOpen = open;
  document
    .querySelectorAll<HTMLButtonElement>(`[${ATTR}]`)
    .forEach((button) => button.setAttribute('aria-expanded', String(open)));
};

/**
 * Shows the modal's supply status on the page's button: a spinner while it
 * runs, "Supplied" for a while after, an alert when it stopped. Clicking
 * the button opens the modal in every state.
 */
export const showSupplyStatus = (status: SupplyStatus) => {
  clearTimeout(calmTimer);
  buttonStatus = status;
  document
    .querySelectorAll<HTMLButtonElement>(`[${ATTR}]`)
    .forEach(renderStatus);

  if (status.state === 'success') {
    calmTimer = setTimeout(
      () => showSupplyStatus({ state: 'idle' }),
      SUPPLIED_FOR_MS,
    );
  }
};

type Fiber = {
  child?: Fiber | null;
  sibling?: Fiber | null;
  memoizedProps?: { client?: unknown } | null;
};

type QueryClient = {
  invalidateQueries: (filters?: { refetchType?: 'active' }) => Promise<void>;
  getQueryCache: () => unknown;
};

const isQueryClient = (value: unknown): value is QueryClient =>
  typeof (value as QueryClient | undefined)?.invalidateQueries === 'function' &&
  typeof (value as QueryClient | undefined)?.getQueryCache === 'function';

/**
 * Aave's React Query client. The page exposes no handle, so it is found in
 * React's fiber tree, as the `client` prop of its QueryClientProvider.
 */
const findQueryClient = (): QueryClient | undefined => {
  const root = document.getElementById('__next');
  const key =
    root &&
    Object.keys(root).find((name) => name.startsWith('__reactContainer$'));

  const stack: (Fiber | null | undefined)[] = key
    ? [(root as unknown as Record<string, Fiber>)[key]]
    : [];

  for (let visited = 0; stack.length && visited < 50_000; visited += 1) {
    const fiber = stack.pop();
    const client = fiber?.memoizedProps?.client;

    if (isQueryClient(client)) {
      return client;
    }

    stack.push(fiber?.sibling, fiber?.child);
  }

  return undefined;
};

/**
 * After a supply lands: refetches what Aave's dashboard shows (positions,
 * balances) now, rather than on its next poll. Best effort: if Aave's
 * internals change, its own polling still catches up.
 */
export const refreshAavePositions = () => {
  const refresh = () => {
    try {
      findQueryClient()
        ?.invalidateQueries({ refetchType: 'active' })
        .catch(() => undefined);
    } catch {
      // Not found or not callable: Aave refreshes on its own schedule.
    }
  };

  refresh();
  setTimeout(refresh, REFRESH_AGAIN_MS);
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
  // It opens a dialog, and says whether that's open.
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', String(modalOpen));
  renderStatus(button);

  Object.assign(button.style, {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
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

  // A focus ring by keyboard, in the page's text colour (it reads on the
  // page): inline styles can't say `:focus-visible`, so the listeners do.
  const ring = getComputedStyle(document.body).color || colors.cta;

  button.addEventListener('focus', () => {
    if (button.matches(':focus-visible')) {
      button.style.outline = `2px solid ${ring}`;
      button.style.outlineOffset = '2px';
    }
  });
  button.addEventListener('blur', () => {
    button.style.outline = '';
    button.style.outlineOffset = '';
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
    const button = createButton(categories, onClick, buttonColors(theme));

    categories.before(button);

    // Its idle width, kept: a shorter status label doesn't shift the row.
    if (buttonStatus.state === 'idle') {
      button.style.minWidth = `${button.offsetWidth}px`;
    }
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
