// @vitest-environment jsdom
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider, useTheme } from './ThemeProvider';

const STORAGE_KEY = 'aurora-ui-theme';

type Listener = (event: MediaQueryListEvent) => void;

/** A controllable `prefers-color-scheme: dark` media query. */
const stubMatchMedia = (initiallyDark: boolean) => {
  const listeners = new Set<Listener>();
  const mediaQuery = {
    matches: initiallyDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: vi.fn((_type: string, listener: Listener) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: string, listener: Listener) => {
      listeners.delete(listener);
    }),
  };

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mediaQuery),
  );

  return {
    mediaQuery,
    listenerCount: () => listeners.size,
    setDark(dark: boolean) {
      mediaQuery.matches = dark;
      act(() => {
        listeners.forEach((listener) =>
          listener({ matches: dark } as MediaQueryListEvent),
        );
      });
    },
  };
};

function ThemeSwitch() {
  const { preference, theme, setPreference } = useTheme();

  return (
    <div>
      <p>
        {preference}:{theme}
      </p>
      <button onClick={() => setPreference('system')} type="button">
        system
      </button>
      <button onClick={() => setPreference('light')} type="button">
        light
      </button>
      <button onClick={() => setPreference('dark')} type="button">
        dark
      </button>
    </div>
  );
}

const renderSwitch = (props?: Parameters<typeof ThemeProvider>[0]) =>
  render(
    <ThemeProvider {...props}>
      <ThemeSwitch />
    </ThemeProvider>,
  );

const dataTheme = () =>
  globalThis.document.documentElement.getAttribute('data-theme');

describe('ThemeProvider', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    globalThis.document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('defaults to system and follows prefers-color-scheme', () => {
    stubMatchMedia(true);
    renderSwitch();

    expect(screen.getByText('system:dark')).toBeInTheDocument();
    expect(dataTheme()).toBe('dark');
  });

  it('flips the theme on a system change while the preference is system', () => {
    const media = stubMatchMedia(false);

    renderSwitch();

    expect(dataTheme()).toBe('light');

    media.setDark(true);

    expect(dataTheme()).toBe('dark');
    expect(screen.getByText('system:dark')).toBeInTheDocument();

    media.setDark(false);

    expect(dataTheme()).toBe('light');
  });

  it('ignores system changes after an explicit choice', async () => {
    const media = stubMatchMedia(false);

    renderSwitch();
    await userEvent.click(screen.getByRole('button', { name: 'light' }));

    media.setDark(true);

    expect(dataTheme()).toBe('light');
  });

  it('removes the media query listener on unmount', () => {
    const media = stubMatchMedia(false);
    const { unmount } = renderSwitch();

    expect(media.listenerCount()).toBe(1);

    unmount();

    expect(media.listenerCount()).toBe(0);
  });

  it('sets data-theme and persists an explicit choice', async () => {
    stubMatchMedia(false);
    renderSwitch();

    await userEvent.click(screen.getByRole('button', { name: 'dark' }));

    expect(dataTheme()).toBe('dark');
    expect(screen.getByText('dark:dark')).toBeInTheDocument();
    expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('clears the stored key when system is chosen', async () => {
    stubMatchMedia(false);
    globalThis.localStorage.setItem(STORAGE_KEY, 'dark');
    renderSwitch();

    await userEvent.click(screen.getByRole('button', { name: 'system' }));

    expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(dataTheme()).toBe('light');
  });

  it('restores a stored choice on mount', () => {
    stubMatchMedia(false);
    globalThis.localStorage.setItem(STORAGE_KEY, 'dark');
    renderSwitch();

    expect(screen.getByText('dark:dark')).toBeInTheDocument();
    expect(dataTheme()).toBe('dark');
  });

  it('ignores an invalid stored value and uses defaultPreference', () => {
    stubMatchMedia(true);
    globalThis.localStorage.setItem(STORAGE_KEY, 'purple');
    renderSwitch({ defaultPreference: 'light' });

    expect(screen.getByText('light:light')).toBeInTheDocument();
    expect(dataTheme()).toBe('light');
  });

  it('uses a custom storageKey', async () => {
    stubMatchMedia(false);
    renderSwitch({ storageKey: 'custom-key' });

    await userEvent.click(screen.getByRole('button', { name: 'dark' }));

    expect(globalThis.localStorage.getItem('custom-key')).toBe('dark');
    expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('does not throw when localStorage throws', async () => {
    stubMatchMedia(false);

    const fail = () => {
      throw new Error('storage unavailable');
    };

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(fail);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(fail);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(fail);

    renderSwitch();

    expect(screen.getByText('system:light')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'dark' }));

    expect(dataTheme()).toBe('dark');

    await userEvent.click(screen.getByRole('button', { name: 'system' }));

    expect(dataTheme()).toBe('light');
  });

  it('resolves to light when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    renderSwitch();

    expect(dataTheme()).toBe('light');
  });
});

describe('useTheme', () => {
  it('throws outside the provider', () => {
    // React 18 and jsdom both report the render error; keep the output clean.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const swallow = (event: ErrorEvent) => event.preventDefault();

    globalThis.addEventListener('error', swallow);

    try {
      expect(() => renderHook(() => useTheme())).toThrow(
        'useTheme must be used inside a <ThemeProvider>.',
      );
    } finally {
      globalThis.removeEventListener('error', swallow);
      vi.restoreAllMocks();
    }
  });
});
