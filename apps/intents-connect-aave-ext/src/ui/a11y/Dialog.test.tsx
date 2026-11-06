// @vitest-environment jsdom
import { fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type KeyboardEvent, useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deepActiveElement, Dialog } from '.';
import { axeViolations, renderInShadow, resetDom } from './testing';

afterEach(resetDom);

/** What has focus, by its name. */
const focused = () => {
  const active = deepActiveElement();

  return active?.getAttribute('aria-label') ?? active?.textContent ?? null;
};

/** A dialog with a title, three controls, and the things tests poke at. */
const Harness = ({
  onClose = () => undefined,
  returnFocus,
}: {
  onClose?: () => void;
  returnFocus?: () => HTMLElement | null;
}) => {
  const title = useRef<HTMLHeadingElement>(null);
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <Dialog
      onClose={onClose}
      labelledBy="title"
      initialFocus={title}
      fallbackFocus={title}
      returnFocus={returnFocus}>
      <h2 id="title" ref={title} tabIndex={-1}>
        Title
      </h2>
      <button type="button">First</button>
      {gone ? null : (
        <button type="button" onClick={() => setGone(true)}>
          Goes away
        </button>
      )}
      <button type="button" disabled={busy} onClick={() => setBusy(true)}>
        Turns busy
      </button>
      <input
        aria-label="Search"
        onKeyDown={(event: KeyboardEvent) => {
          // Claims Escape, as a search field clearing itself would.
          if (event.key === 'Escape') {
            event.preventDefault();
          }
        }}
      />
      <button type="button">Last</button>
    </Dialog>
  );
};

const openWithOpener = (props: Parameters<typeof Harness>[0] = {}) => {
  const opener = document.createElement('button');

  opener.textContent = 'Supply with Aurora';
  document.body.append(opener);
  opener.focus();

  return { opener, ...renderInShadow(<Harness {...props} />) };
};

describe('Dialog', () => {
  it('starts on its title, and Tab and Shift+Tab wrap inside it', async () => {
    const user = userEvent.setup();

    openWithOpener();
    await waitFor(() => expect(focused()).toBe('Title'));

    const order: (string | null)[] = [];

    for (let step = 0; step < 6; step += 1) {
      // eslint-disable-next-line no-await-in-loop -- one key at a time
      await user.tab();
      order.push(focused());
    }

    expect(order).toEqual([
      'First',
      'Goes away',
      'Turns busy',
      'Search',
      'Last',
      'First',
    ]);

    await user.tab({ shift: true });

    expect(focused()).toBe('Last');
  });

  it('goes to the last control on Shift+Tab from its title', async () => {
    const user = userEvent.setup();

    openWithOpener();
    await waitFor(() => expect(focused()).toBe('Title'));
    await user.tab({ shift: true });

    expect(focused()).toBe('Last');
  });

  it('closes on Escape, unless something inside claims it', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { shadow } = openWithOpener({ onClose });

    shadow.querySelector('input')!.focus();
    await user.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();

    (shadow.querySelector('button') as HTMLElement).focus();
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('brings focus back when its element goes or turns disabled', async () => {
    const user = userEvent.setup();
    const { shadow } = openWithOpener();
    const button = (name: string) =>
      [...shadow.querySelectorAll('button')].find(
        (element) => element.textContent === name,
      )!;

    await user.click(button('Goes away'));
    await waitFor(() => expect(focused()).toBe('Title'));

    await user.click(button('Turns busy'));
    await waitFor(() => expect(focused()).toBe('Title'));
  });

  it('makes the page inert and still, and restores it on close', async () => {
    const already = document.createElement('div');

    already.setAttribute('inert', '');
    document.body.append(already);
    document.documentElement.style.overflow = 'scroll';

    const { opener, host, unmount } = openWithOpener();

    expect(opener).toHaveAttribute('inert');
    expect(host).not.toHaveAttribute('inert');
    expect(document.documentElement).toHaveStyle({ overflow: 'hidden' });

    // Added while open, e.g. a wallet's own prompt: left usable.
    const prompt = document.createElement('div');

    document.body.append(prompt);

    expect(prompt).not.toHaveAttribute('inert');

    unmount();

    expect(opener).not.toHaveAttribute('inert');
    expect(already).toHaveAttribute('inert');
    expect(document.documentElement).toHaveStyle({ overflow: 'scroll' });
  });

  it('returns focus to the opener on close', async () => {
    const { opener, unmount } = openWithOpener();

    await waitFor(() => expect(focused()).toBe('Title'));
    unmount();
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("falls back to returnFocus when the opener's gone", async () => {
    const fallback = document.createElement('button');

    fallback.textContent = 'Page button';

    const { opener, unmount } = openWithOpener({ returnFocus: () => fallback });

    document.body.append(fallback);
    await waitFor(() => expect(focused()).toBe('Title'));
    opener.remove();
    unmount();
    await waitFor(() => expect(fallback).toHaveFocus());
  });

  it('passes axe', async () => {
    const { host } = openWithOpener();

    expect(await axeViolations(host)).toEqual([]);
  });

  it('runs onEscape for Escape, and onClose for the backdrop', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onEscape = vi.fn();
    const { shadow } = renderInShadow(
      <Dialog onClose={onClose} onEscape={onEscape} labelledBy="title">
        <h2 id="title">History</h2>
        <button type="button">Back</button>
      </Dialog>,
    );

    shadow.querySelector('button')!.focus();
    await user.keyboard('{Escape}');

    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(
      shadow.querySelector('[role="dialog"]')!.parentElement!,
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// Not in a shadow root: the plain document case works too.
it('traps focus in the document as well', async () => {
  const user = userEvent.setup();

  render(
    <Dialog onClose={() => undefined} labelledBy="t">
      <h2 id="t">Plain</h2>
      <button type="button">Only</button>
    </Dialog>,
  );

  await waitFor(() => expect(document.activeElement?.textContent).toBe('Only'));
  await user.tab();

  expect(document.activeElement?.textContent).toBe('Only');

  resetDom();
});
