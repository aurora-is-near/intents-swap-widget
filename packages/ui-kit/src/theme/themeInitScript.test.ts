// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getThemeInitScript } from './themeInitScript';

/** Runs the script the way a browser runs an inline <script> in <head>. */
const run = (script: string) => {
  const element = globalThis.document.createElement('script');

  element.textContent = script;
  globalThis.document.head.append(element);
  element.remove();
};

it('runs inline scripts in this environment', () => {
  run('document.documentElement.dataset.probe = "ran"');

  expect(globalThis.document.documentElement).toHaveAttribute(
    'data-probe',
    'ran',
  );

  globalThis.document.documentElement.removeAttribute('data-probe');
});

const dataTheme = () =>
  globalThis.document.documentElement.getAttribute('data-theme');

describe('getThemeInitScript', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    globalThis.document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(['light', 'dark'])('applies a stored %s choice', (theme) => {
    globalThis.localStorage.setItem('aurora-ui-theme', theme);
    run(getThemeInitScript());

    expect(dataTheme()).toBe(theme);
  });

  it('leaves data-theme unset with no stored choice', () => {
    run(getThemeInitScript());

    expect(dataTheme()).toBeNull();
  });

  it('ignores an invalid stored value', () => {
    globalThis.localStorage.setItem('aurora-ui-theme', 'purple');
    run(getThemeInitScript());

    expect(dataTheme()).toBeNull();
  });

  it('reads a custom storage key', () => {
    globalThis.localStorage.setItem('aurora-ui-theme', 'light');
    globalThis.localStorage.setItem('custom-key', 'dark');
    run(getThemeInitScript('custom-key'));

    expect(dataTheme()).toBe('dark');
  });

  it('does not throw when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    // An inline script's uncaught error surfaces as a window error event.
    const onError = vi.fn((event: ErrorEvent) => event.preventDefault());

    globalThis.addEventListener('error', onError);

    try {
      run(getThemeInitScript());
    } finally {
      globalThis.removeEventListener('error', onError);
    }

    expect(onError).not.toHaveBeenCalled();
    expect(dataTheme()).toBeNull();
  });

  it('cannot close the surrounding script tag through the key', () => {
    const script = getThemeInitScript('</script><script>alert(1)//');

    expect(script).not.toContain('</script>');
  });
});
