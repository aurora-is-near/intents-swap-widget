/**
 * polymarket.com only (isolated world): adds "Deposit with Aurora" next to
 * Polymarket's own Deposit button in the header, and as a full-width row
 * under Deposit | Withdraw on the portfolio page. A click opens the
 * extension's side panel on its Polymarket deposit form.
 *
 * Polymarket is a single-page app that re-renders freely, so the buttons are
 * (re)inserted from a MutationObserver and found again by their data
 * attribute rather than kept by reference.
 */
import { CHANNEL } from '../shared/bridge';
import type { OpenAppMessage } from '../shared/bridge';

const ATTR = 'data-aurora-deposit';
const LABEL = 'Deposit with Aurora';

/** The theme's accent-600 → accent-800: dark enough for a white label. */
const GRADIENT = 'linear-gradient(135deg, #BA7AFF 0%, #7300B7 100%)';

const MARK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 3.5 20h3.6L12 10.2 16.9 20h3.6L12 3Z" fill="currentColor"/></svg>`;

/** Visible text of an element, normalised. */
const textOf = (element: Element) =>
  (element.textContent ?? '').replace(/\s+/g, ' ').trim();

/** Buttons and links whose text is exactly `label`. */
const findByText = (root: ParentNode, label: string) =>
  [...root.querySelectorAll('button, a')].filter(
    (element) => textOf(element) === label && !element.hasAttribute(ATTR),
  );

/** The Polymarket account the page shows: its profile link's address. */
const pageAccount = () => {
  const link = document.querySelector<HTMLAnchorElement>(
    'a[href^="/profile/0x"]',
  );

  const match = link
    ?.getAttribute('href')
    ?.match(/\/profile\/(0x[0-9a-fA-F]{40})/);

  return match?.[1];
};

const showHint = (anchor: HTMLElement, message: string) => {
  const hint = document.createElement('div');

  hint.textContent = message;
  Object.assign(hint.style, {
    position: 'fixed',
    zIndex: '2147483647',
    padding: '8px 12px',
    borderRadius: '8px',
    background: '#1b1b1f',
    color: '#fff',
    font: '500 13px/1.3 system-ui, sans-serif',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  });

  const rect = anchor.getBoundingClientRect();

  hint.style.top = `${rect.bottom + 8}px`;
  hint.style.left = `${Math.max(8, rect.left)}px`;
  document.body.append(hint);
  setTimeout(() => hint.remove(), 4000);
};

const openPanel = (button: HTMLElement) => {
  const message: OpenAppMessage = {
    channel: CHANNEL,
    type: 'open-app',
    app: 'polymarket',
    account: pageAccount(),
  };

  chrome.runtime
    .sendMessage(message)
    .then((response: { ok: boolean; error?: string } | undefined) => {
      if (response && !response.ok) {
        showHint(
          button,
          'Click the Aurora Intents icon in the toolbar to continue.',
        );
      }
    })
    .catch(() => {
      // The extension was reloaded or updated since this page loaded.
      showHint(button, 'Reload the page to use Aurora.');
    });
};

const isPainted = (element: Element) => {
  const { backgroundColor } = getComputedStyle(element);

  return (
    backgroundColor !== 'transparent' &&
    !/rgba\(.*,\s*0\)$/.test(backgroundColor)
  );
};

const area = (element: Element) => {
  const { width, height } = element.getBoundingClientRect();

  return width * height;
};

/**
 * The corner radius the reference button actually shows: that of the
 * largest element painting a background inside it. The first painted one
 * may be a small rounded icon chip, and a wrapping link may carry a radius
 * nobody sees.
 */
const visibleRadius = (reference: HTMLElement) => {
  const painted = [reference, ...reference.querySelectorAll('*')]
    .filter(isPainted)
    .sort((a, b) => area(b) - area(a))[0];

  const radius = getComputedStyle(painted ?? reference).borderRadius;
  const { height } = reference.getBoundingClientRect();

  // Never rounder than the reference's own shape allows.
  return radius && parseFloat(radius) < height / 2 ? radius : '12px';
};

/** Our button, sized like the site's `reference` button. */
const createButton = (
  place: 'header' | 'portfolio',
  reference: HTMLElement,
) => {
  const style = getComputedStyle(reference);
  const button = document.createElement('button');

  button.type = 'button';
  button.setAttribute(ATTR, place);
  button.innerHTML = `${MARK}<span>${LABEL}</span>`;

  Object.assign(button.style, {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxSizing: 'border-box',
    height: style.height && style.height !== 'auto' ? style.height : '36px',
    padding: place === 'portfolio' ? '0 16px' : style.padding || '0 14px',
    borderRadius: visibleRadius(reference),
    border: 'none',
    background: GRADIENT,
    color: '#ffffff',
    font: `600 ${style.fontSize || '14px'}/1 ${style.fontFamily || 'inherit'}`,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'filter 120ms ease',
    flexShrink: '0',
  });

  if (place === 'portfolio') {
    button.style.width = '100%';
  }

  button.addEventListener('mouseenter', () => {
    button.style.filter = 'brightness(1.06)';
  });
  button.addEventListener('mouseleave', () => {
    button.style.filter = '';
  });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openPanel(button);
  });

  return button;
};

/** The site's top bar: a sticky `<nav>` today, a `<header>` possibly later. */
const topBar = () =>
  document.querySelector('header') ?? document.querySelector('nav');

/** Next to the top bar's Deposit button. */
const placeHeaderButton = () => {
  const header = topBar();

  if (!header || header.querySelector(`[${ATTR}="header"]`)) {
    return;
  }

  const deposit = findByText(header, 'Deposit')[0];

  if (deposit instanceof HTMLElement) {
    const button = createButton('header', deposit);
    // Its wrapper may lay the buttons out without a gap of its own.
    const gap =
      parseFloat(
        getComputedStyle(deposit.parentElement ?? deposit).columnGap,
      ) || 0;

    button.style.marginLeft = gap > 0 ? '0' : '8px';
    deposit.after(button);
  }
};

/** The innermost element holding both `a` and `b`. */
const commonParent = (a: Element, b: Element) => {
  let node: Element | null = a.parentElement;

  while (node && !node.contains(b)) {
    node = node.parentElement;
  }

  return node;
};

const depthOf = (element: Element | null) => {
  let depth = 0;
  let node = element;

  while (node) {
    depth += 1;
    node = node.parentElement;
  }

  return depth;
};

/** A full-width row under the portfolio card's Deposit | Withdraw. */
const placePortfolioButton = () => {
  const existing = document.querySelector(`[${ATTR}="portfolio"]`);

  if (!window.location.pathname.startsWith('/portfolio')) {
    existing?.remove();

    return;
  }

  if (existing) {
    return;
  }

  const header = topBar();
  const outsideHeader = (element: Element) => !header?.contains(element);
  const isShown = (element: Element) => area(element) > 0;
  const withdraw = findByText(document, 'Withdraw').find(
    (element) => outsideHeader(element) && isShown(element),
  );

  // The visible Deposit closest to it: the page may hold hidden copies.
  const deposit = withdraw
    ? findByText(document, 'Deposit')
        .filter((element) => outsideHeader(element) && isShown(element))
        .sort(
          (a, b) =>
            depthOf(commonParent(a, withdraw)) -
            depthOf(commonParent(b, withdraw)),
        )
        .reverse()[0]
    : undefined;

  if (!(deposit instanceof HTMLElement) || !withdraw) {
    return;
  }

  const row = commonParent(deposit, withdraw);

  if (!(row instanceof HTMLElement)) {
    return;
  }

  const button = createButton('portfolio', deposit);
  const gap = parseFloat(getComputedStyle(row).gap) || 12;

  button.style.marginTop = `${gap}px`;
  row.after(button);
};

let scheduled = false;

const place = () => {
  scheduled = false;
  placeHeaderButton();
  placePortfolioButton();
};

const schedule = () => {
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(place);
  }
};

new MutationObserver(schedule).observe(document.body, {
  childList: true,
  subtree: true,
});

window.addEventListener('popstate', schedule);
schedule();
