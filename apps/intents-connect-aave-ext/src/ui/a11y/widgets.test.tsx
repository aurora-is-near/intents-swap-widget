// @vitest-environment jsdom
import { fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CopyButton } from '../ui';
import {
  Announcer,
  deepActiveElement,
  Dialog,
  useAnnounce,
  useDisclosure,
  useListbox,
  useSettledAnnouncement,
  useTabs,
} from '.';
import { axeViolations, renderInShadow, resetDom } from './testing';

afterEach(resetDom);

const focusedName = () => {
  const active = deepActiveElement();

  return active?.getAttribute('aria-label') ?? active?.textContent ?? null;
};

const CHAINS = ['evm', 'ton', 'sol'] as const;

type Chain = (typeof CHAINS)[number];

const TabsDemo = ({ focusOnMount = false }: { focusOnMount?: boolean }) => {
  const [chain, setChain] = useState<Chain>('evm');
  const tabs = useTabs({
    items: CHAINS,
    value: chain,
    onChange: setChain,
    focusOnMount,
  });

  return (
    <>
      <div {...tabs.listProps("Phone wallet's chain")}>
        {CHAINS.map((id) => (
          <button key={id} {...tabs.tabProps(id)}>
            {id.toUpperCase()}
          </button>
        ))}
      </div>
      <div {...tabs.panelProps(chain)}>Pair a {chain} phone</div>
    </>
  );
};

describe('useTabs', () => {
  it('is one Tab stop, moved with arrows, Home and End', async () => {
    const user = userEvent.setup();
    const { shadow } = renderInShadow(<TabsDemo />);
    const view = within(shadow as unknown as HTMLElement);
    const tab = (name: string) => view.getByRole('tab', { name });

    expect(view.getByRole('tablist')).toHaveAttribute(
      'aria-label',
      "Phone wallet's chain",
    );
    expect(['EVM', 'TON', 'SOL'].map((name) => tab(name).tabIndex)).toEqual([
      0, -1, -1,
    ]);

    tab('EVM').focus();
    await user.keyboard('{ArrowRight}');

    expect(focusedName()).toBe('TON');
    expect(tab('TON')).toHaveAttribute('aria-selected', 'true');
    expect(view.getByRole('tabpanel')).toHaveTextContent('Pair a ton phone');

    await user.keyboard('{End}');

    expect(focusedName()).toBe('SOL');

    await user.keyboard('{ArrowRight}');

    expect(focusedName()).toBe('EVM');

    await user.keyboard('{ArrowLeft}');

    expect(focusedName()).toBe('SOL');

    await user.keyboard('{Home}');

    expect(focusedName()).toBe('EVM');
  });

  it('points the selected tab at its panel, and the panel back', () => {
    const { shadow } = renderInShadow(<TabsDemo />);
    const view = within(shadow as unknown as HTMLElement);
    const selected = view.getByRole('tab', { name: 'EVM' });
    const panel = view.getByRole('tabpanel');

    expect(selected).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', selected.id);
    // The others' panels aren't rendered: they point nowhere.
    expect(view.getByRole('tab', { name: 'TON' })).not.toHaveAttribute(
      'aria-controls',
    );
  });

  it('focuses the selected tab on mount when asked (a remounted switch)', async () => {
    renderInShadow(<TabsDemo focusOnMount />);
    await waitFor(() => expect(focusedName()).toBe('EVM'));
  });

  it('passes axe', async () => {
    const { host } = renderInShadow(<TabsDemo />);

    expect(await axeViolations(host)).toEqual([]);
  });
});

const DisclosureDemo = () => {
  const [open, setOpen] = useState(false);
  const group = useDisclosure(open);

  return (
    <section>
      <h3>
        <button
          type="button"
          {...group.triggerProps}
          onClick={() => setOpen(!open)}>
          Solana
        </button>
      </h3>
      <div {...group.panelProps}>
        <button type="button">Phantom</button>
      </div>
    </section>
  );
};

describe('useDisclosure', () => {
  it('keeps a closed group out of reach, and says what it controls', async () => {
    const user = userEvent.setup();
    const { shadow, host } = renderInShadow(<DisclosureDemo />);
    const view = within(shadow as unknown as HTMLElement);
    const trigger = view.getByRole('button', { name: 'Solana' });
    const panel = shadow.getElementById(
      trigger.getAttribute('aria-controls')!,
    )!;

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(panel).toHaveAttribute('inert');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(panel).not.toHaveAttribute('inert');
    expect(await axeViolations(host)).toEqual([]);
  });
});

const RESERVES = [
  { id: 'usdc', label: 'USDC' },
  { id: 'usdt', label: 'USDT', disabled: true },
  { id: 'weth', label: 'WETH' },
  { id: 'wbtc', label: 'WBTC' },
] as const;

type Reserve = (typeof RESERVES)[number]['id'];

const ListboxDemo = ({ onClose = () => undefined }) => {
  const [reserve, setReserve] = useState<Reserve>('usdc');
  const title = useRef<HTMLHeadingElement>(null);
  const picker = useListbox({
    options: RESERVES,
    value: reserve,
    onChange: setReserve,
    label: 'Reserve to supply',
  });

  return (
    <Dialog onClose={onClose} labelledBy="title" initialFocus={title}>
      <h2 id="title" ref={title} tabIndex={-1}>
        Supply
      </h2>
      <button {...picker.triggerProps}>
        Supply as {reserve.toUpperCase()}
      </button>
      {picker.open ? (
        <ul {...picker.listProps}>
          {RESERVES.map((option) => (
            <li key={option.id} {...picker.optionProps(option)}>
              {option.label}
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button">Supply</button>
    </Dialog>
  );
};

describe('useListbox', () => {
  const setup = (onClose = vi.fn()) => {
    const user = userEvent.setup();
    const rendered = renderInShadow(<ListboxDemo onClose={onClose} />);
    const view = within(rendered.shadow as unknown as HTMLElement);
    const trigger = view.getByRole('button', { name: /Supply as/ });

    return { user, view, trigger, onClose, ...rendered };
  };

  it('opens on the selected option, skips disabled ones, and picks with Enter', async () => {
    const { user, view, trigger } = setup();

    trigger.focus();
    await user.keyboard('{ArrowDown}');

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute(
      'aria-controls',
      view.getByRole('listbox').id,
    );
    expect(focusedName()).toBe('USDC');

    await user.keyboard('{ArrowDown}');

    expect(focusedName()).toBe('WETH');

    await user.keyboard('{Enter}');

    expect(view.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent('Supply as WETH');
    expect(deepActiveElement()).toBe(trigger);
  });

  it('closes on Escape without closing the dialog', async () => {
    const { user, view, trigger, onClose } = setup();

    await user.click(trigger);

    expect(view.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(view.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(deepActiveElement()).toBe(trigger);
  });

  it('marks the selection, searches by letter, and jumps to the ends', async () => {
    const { user, view, trigger } = setup();

    await user.click(trigger);

    expect(view.getByRole('option', { name: 'USDC' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(view.getByRole('option', { name: 'USDT' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await user.keyboard('wb');

    expect(focusedName()).toBe('WBTC');

    await user.keyboard('{Home}');

    expect(focusedName()).toBe('USDC');

    await user.keyboard('{End}');

    expect(focusedName()).toBe('WBTC');
  });

  it('closes on a press outside', async () => {
    const { view, trigger } = setup();

    fireEvent.click(trigger);

    expect(view.getByRole('listbox')).toBeInTheDocument();

    fireEvent.pointerDown(view.getByRole('heading'));
    await waitFor(() =>
      expect(view.queryByRole('listbox')).not.toBeInTheDocument(),
    );
  });

  it('passes axe, open', async () => {
    const { user, host, trigger } = setup();

    await user.click(trigger);

    expect(await axeViolations(host)).toEqual([]);
  });
});

const Speaker = () => {
  const announce = useAnnounce();

  return (
    <>
      <button type="button" onClick={() => announce('Balances updated')}>
        Polite
      </button>
      <button
        type="button"
        onClick={() => announce('The supply failed', 'assertive')}>
        Assertive
      </button>
    </>
  );
};

describe('Announcer', () => {
  const regions = (shadow: ShadowRoot) => ({
    polite: shadow.querySelector('[aria-live="polite"]')!,
    assertive: shadow.querySelector('[aria-live="assertive"]')!,
  });

  it('reads messages from the right region, a repeat included', async () => {
    const user = userEvent.setup();
    const { shadow } = renderInShadow(
      <Announcer>
        <Speaker />
      </Announcer>,
    );

    const view = within(shadow as unknown as HTMLElement);
    const live = regions(shadow);

    await user.click(view.getByRole('button', { name: 'Polite' }));
    await waitFor(() =>
      expect(live.polite).toHaveTextContent('Balances updated'),
    );

    // The same message again: emptied first, so it's read again.
    await user.click(view.getByRole('button', { name: 'Polite' }));

    expect(live.polite).toHaveTextContent('');

    await waitFor(() =>
      expect(live.polite).toHaveTextContent('Balances updated'),
    );

    await user.click(view.getByRole('button', { name: 'Assertive' }));
    await waitFor(() =>
      expect(live.assertive).toHaveTextContent('The supply failed'),
    );
  });

  it('says a copy worked, or that it failed', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValueOnce(undefined);

    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const { shadow } = renderInShadow(
      <Announcer>
        <CopyButton value="0xabc" label="deposit address" />
      </Announcer>,
    );

    const live = regions(shadow);
    const button = within(shadow as unknown as HTMLElement).getByRole(
      'button',
      { name: 'Copy deposit address' },
    );

    await user.click(button);
    await waitFor(() =>
      expect(live.polite).toHaveTextContent('Copied the deposit address'),
    );

    writeText.mockRejectedValueOnce(new Error('denied'));
    await user.click(button);
    await waitFor(() =>
      expect(live.assertive).toHaveTextContent(
        "Couldn't copy the deposit address",
      ),
    );
  });
});

const Settling = ({ message }: { message?: string }) => {
  useSettledAnnouncement(message);

  return null;
};

describe('useSettledAnnouncement', () => {
  it('skips the first value, and reads the last of quick changes', async () => {
    const { shadow, rerender } = renderInShadow(
      <Announcer>
        <Settling message="Enter an amount" />
      </Announcer>,
    );

    const polite = shadow.querySelector('[aria-live="polite"]')!;

    await new Promise((resolve) => {
      setTimeout(resolve, 800);
    });

    expect(polite).toHaveTextContent('');

    rerender(
      <Announcer>
        <Settling message="Not enough USDC" />
      </Announcer>,
    );
    rerender(
      <Announcer>
        <Settling message="Supply USDC" />
      </Announcer>,
    );
    await waitFor(() => expect(polite).toHaveTextContent('Supply USDC'), {
      timeout: 2000,
    });
  });
});

/** A switch inside what it switches, remounted with it (EVM/TON). */
const RemountingTabs = () => {
  const [chain, setChain] = useState<'evm' | 'ton'>('evm');
  const tabs = useTabs({
    items: ['evm', 'ton'] as const,
    value: chain,
    onChange: setChain,
  });

  return (
    <div {...tabs.panelProps(chain)} key={chain}>
      <div {...tabs.listProps('Network')}>
        <button {...tabs.tabProps('evm')}>EVM</button>
        <button {...tabs.tabProps('ton')}>TON</button>
      </div>
    </div>
  );
};

describe('useTabs, remounting', () => {
  it('keeps focus on the picked tab when the tablist remounts', async () => {
    const user = userEvent.setup();
    const { shadow } = renderInShadow(<RemountingTabs />);
    const view = within(shadow as unknown as HTMLElement);

    view.getByRole('tab', { name: 'EVM' }).focus();
    await user.keyboard('{ArrowRight}');

    expect(focusedName()).toBe('TON');

    await user.keyboard('{Enter}');

    expect(focusedName()).toBe('TON');
  });
});
