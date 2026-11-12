import { createRoot, type Root } from 'react-dom/client';

import { ThemeInspector } from './Inspector';
import { INSPECTOR_CSS } from './styles';

const HOST_ID = 'aurora-intents-theme-inspector';
const PARAM = 'aurora-theme';

type AuroraGlobal = Window & { auroraIntents?: Record<string, unknown> };

/**
 * The theme inspector's switches (call it behind `THEME_INSPECTOR`, so
 * builds without it drop it): `?aurora-theme=inspect` in the URL opens it, and so
 * does `auroraIntents.theme.inspect()` in the console (`.close()` closes
 * it). It renders in its own shadow root, above the modal.
 */
export const installThemeInspector = ({
  open,
}: {
  /** Opens the themed UI, for the inspector's "Open it". */
  open?: () => void;
} = {}) => {
  let mounted: { root: Root; host: HTMLElement } | undefined;

  const close = () => {
    mounted?.root.unmount();
    mounted?.host.remove();
    mounted = undefined;
  };

  const inspect = () => {
    if (mounted) {
      return;
    }

    const host = document.createElement('div');

    host.id = HOST_ID;
    // Ours: the page-theme reader skips it.
    host.setAttribute('data-aurora-intents', '');
    host.style.cssText =
      'position: fixed; top: 0; left: 0; z-index: 2147483647;';

    // Keys typed here stay here: not the modal's Escape, nor the page's
    // shortcuts.
    ['keydown', 'keyup', 'keypress'].forEach((type) =>
      host.addEventListener(type, (event) => event.stopPropagation()),
    );

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    const container = document.createElement('div');

    style.textContent = INSPECTOR_CSS;
    shadow.append(style, container);
    document.body.append(host);

    const root = createRoot(container);

    root.render(<ThemeInspector onClose={close} onOpen={open} />);
    mounted = { root, host };
  };

  const global = window as AuroraGlobal;

  global.auroraIntents = { ...global.auroraIntents, theme: { inspect, close } };

  if (new URLSearchParams(window.location.search).get(PARAM) === 'inspect') {
    inspect();
  }
};
