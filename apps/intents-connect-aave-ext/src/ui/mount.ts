import css from './styles.css?inline';

const PROPERTIES_ATTR = 'data-aurora-intents-properties';

/**
 * Chrome ignores `@property` inside a shadow root, and Tailwind v4 relies on
 * it for the initial values of its `--tw-*` variables (borders, shadows,
 * rings…). Registered from the document, they apply in shadow roots too.
 */
const registerProperties = () => {
  const rules = css.match(/@property\s[^{]+\{[^}]*\}/g);

  if (!rules || document.querySelector(`style[${PROPERTIES_ATTR}]`)) {
    return;
  }

  const style = document.createElement('style');

  style.setAttribute(PROPERTIES_ATTR, '');
  style.textContent = rules.join('\n');
  document.head.append(style);
};

/**
 * Where the modal renders: a shadow root on `document.body`, so the page's
 * styles stay out and ours stay in. Returns the element to render into, or
 * the existing one if `id` is already mounted.
 */
export const createShadowHost = (id: string): HTMLElement => {
  const existing = document.getElementById(id)?.shadowRoot?.lastElementChild;

  if (existing instanceof HTMLElement) {
    return existing;
  }

  const host = document.createElement('div');

  host.id = id;
  // Out of the page's flow, and above anything the page renders. Only
  // placement goes inline: an inline style beats every `:host` rule.
  host.style.cssText = 'position: fixed; top: 0; left: 0; z-index: 2147483647;';

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  const container = document.createElement('div');

  style.textContent = css;
  shadow.append(style, container);
  document.body.append(host);
  registerProperties();

  return container;
};
