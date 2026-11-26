import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RISK_ZONE_COLORS, Slider, type SliderProps } from '../Slider';

const LABEL = 'Loan to value, percent';

/** The artboard's LTV zones (Web-Borrow.dc.html line 304), max 90. */
const LTV_ZONES = [
  { upTo: 50, color: RISK_ZONE_COLORS[0] },
  { upTo: 65, color: RISK_ZONE_COLORS[1] },
  { upTo: 80, color: RISK_ZONE_COLORS[2] },
  { upTo: 90, color: RISK_ZONE_COLORS[3] },
];

/** A controlled slider, as the app uses it. */
function Controlled({
  initial,
  onValueChange,
  ...props
}: Omit<SliderProps, 'value' | 'onValueChange'> & {
  initial: number;
  onValueChange?: (value: number) => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <Slider
      aria-label={LABEL}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
      value={value}
      {...props}
    />
  );
}

const focusSlider = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.tab();

  const slider = screen.getByRole('slider', { name: LABEL });

  expect(slider).toHaveFocus();

  return slider;
};

/**
 * The slider is Base UI's native `<input type="range">`: browsers expose its
 * `min` and `max` attributes as `aria-valuemin` and `aria-valuemax`
 * (HTML-AAM), and ARIA in HTML says not to repeat them as ARIA attributes.
 * `aria-valuenow` is set explicitly. jsdom does not compute the mapping, so
 * read each from where the browser does.
 */
const ariaRangeOf = (slider: HTMLElement) => ({
  min: slider.getAttribute('aria-valuemin') ?? slider.getAttribute('min'),
  max: slider.getAttribute('aria-valuemax') ?? slider.getAttribute('max'),
  now: slider.getAttribute('aria-valuenow'),
});

const percentOf = (element: Element) =>
  Number.parseFloat((element as HTMLElement).style.width);

describe('Slider', () => {
  it('shows no outline on its control when focused', async () => {
    const user = userEvent.setup();

    render(<Slider aria-label={LABEL} max={90} min={10} value={40} />);

    const slider = await focusSlider(user);
    const control = slider.closest('.h-9');

    expect(control).not.toBeNull();
    expect(control?.className).not.toContain('outline');
  });

  it('has role slider with its label, min, max and value', () => {
    render(<Slider aria-label={LABEL} max={90} min={10} value={40} />);

    const slider = screen.getByRole('slider', { name: LABEL });

    expect(slider).toHaveAttribute('type', 'range');
    expect(ariaRangeOf(slider)).toEqual({ min: '10', max: '90', now: '40' });
  });

  it('moves by step on the arrow keys', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Controlled
        initial={40}
        max={90}
        onValueChange={onValueChange}
        step={5}
      />,
    );

    const slider = await focusSlider(user);

    await user.keyboard('{ArrowRight}');

    expect(slider).toHaveAttribute('aria-valuenow', '45');
    expect(onValueChange).toHaveBeenLastCalledWith(45);

    await user.keyboard('{ArrowUp}');

    expect(slider).toHaveAttribute('aria-valuenow', '50');

    await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowDown}');

    expect(slider).toHaveAttribute('aria-valuenow', '35');
  });

  it('jumps to min on Home and to max on End', async () => {
    const user = userEvent.setup();

    render(<Controlled initial={40} max={90} min={10} />);

    const slider = await focusSlider(user);

    await user.keyboard('{End}');

    expect(slider).toHaveAttribute('aria-valuenow', '90');

    await user.keyboard('{Home}');

    expect(slider).toHaveAttribute('aria-valuenow', '10');
  });

  it('never passes max', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Controlled
        initial={88}
        max={90}
        onValueChange={onValueChange}
        step={1}
      />,
    );

    const slider = await focusSlider(user);

    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}');

    expect(slider).toHaveAttribute('aria-valuenow', '90');
    expect(
      onValueChange.mock.calls.every(([value]) => (value as number) <= 90),
    ).toBe(true);

    await user.keyboard('{PageUp}{End}');

    expect(slider).toHaveAttribute('aria-valuenow', '90');
  });

  it('ignores the keyboard when disabled', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<Controlled disabled initial={40} onValueChange={onValueChange} />);

    const slider = screen.getByRole('slider', { name: LABEL });

    expect(slider).toBeDisabled();

    slider.focus();
    await user.keyboard('{ArrowRight}{End}');

    expect(slider).toHaveAttribute('aria-valuenow', '40');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('paints zone segments as wide as their share of the range', () => {
    const { container } = render(
      <Slider aria-label={LABEL} max={90} value={40} zones={LTV_ZONES} />,
    );

    const segments = [
      ...container.querySelectorAll('[data-slot="zone"]'),
    ] as HTMLElement[];

    // 50, 15, 15 and 10 of 90.
    expect(segments.map(percentOf).map((width) => width.toFixed(4))).toEqual(
      [50 / 90, 15 / 90, 15 / 90, 10 / 90].map((share) =>
        (share * 100).toFixed(4),
      ),
    );
    expect(segments.map((segment) => segment.style.background)).toEqual([
      'rgb(203, 234, 140)',
      'rgb(243, 224, 138)',
      'rgb(245, 182, 107)',
      'rgb(229, 105, 79)',
    ]);
  });

  it('measures zones from min and clamps them to max', () => {
    const { container } = render(
      <Slider
        aria-label={LABEL}
        max={60}
        min={20}
        value={30}
        zones={[
          { upTo: 30, color: RISK_ZONE_COLORS[0] },
          { upTo: 50, color: RISK_ZONE_COLORS[1] },
          { upTo: 90, color: RISK_ZONE_COLORS[2] },
        ]}
      />,
    );

    const widths = [...container.querySelectorAll('[data-slot="zone"]')].map(
      percentOf,
    );

    expect(widths).toEqual([25, 50, 25]);
  });

  it('exports the four artboard risk zone colours', () => {
    expect(RISK_ZONE_COLORS).toEqual([
      '#CBEA8C',
      '#F3E08A',
      '#F5B66B',
      '#E5694F',
    ]);
  });

  it('renders the plain track, with no zones, when zones are not given', () => {
    const { container } = render(<Slider aria-label={LABEL} value={50} />);

    expect(container.querySelector('[data-slot="zones"]')).toBeNull();
    expect(ariaRangeOf(screen.getByRole('slider'))).toEqual({
      min: '0',
      max: '100',
      now: '50',
    });
  });

  it('places the marker at (value − min) / (max − min) of the track', () => {
    const { container } = render(
      <Slider
        aria-label={LABEL}
        marker={{ value: 83, label: 'liq. 83%' }}
        max={90}
        min={20}
        value={40}
        zones={LTV_ZONES}
      />,
    );

    const marker = container.querySelector<HTMLElement>('[data-slot="marker"]');

    const label = screen.getByText('liq. 83%');
    const expected = ((83 - 20) / (90 - 20)) * 100;

    [marker, label].forEach((element) => {
      const inset = element?.style.getPropertyValue('inset-inline-start') ?? '';

      expect(Number.parseFloat(inset)).toBeCloseTo(expected);
      expect(element?.style.getPropertyValue('translate')).toBe('-50% 0');
    });
  });

  it('places the marker from the inline start in RTL, as the thumb', () => {
    const { container } = render(
      <DirectionProvider direction="rtl">
        <div dir="rtl">
          <Slider
            aria-label={LABEL}
            marker={{ value: 80, label: 'liq. 80%' }}
            value={40}
          />
        </div>
      </DirectionProvider>,
    );

    const marker = container.querySelector<HTMLElement>('[data-slot="marker"]');

    [marker, screen.getByText('liq. 80%')].forEach((element) => {
      expect(element?.style.getPropertyValue('inset-inline-start')).toBe('80%');
      expect(element?.style.getPropertyValue('translate')).toBe('50% 0');
      expect(element?.style.left).toBe('');
    });
  });

  it('describes the slider with the marker label', () => {
    render(
      <Slider
        aria-describedby="hint"
        aria-label={LABEL}
        marker={{ value: 83, label: 'liq. 83%' }}
        max={90}
        value={40}
      />,
    );

    const slider = screen.getByRole('slider', { name: LABEL });
    const labelId = screen.getByText('liq. 83%').id;

    expect(slider.getAttribute('aria-describedby')?.split(' ')).toEqual([
      'hint',
      labelId,
    ]);
  });

  it('draws no marker without one', () => {
    const { container } = render(<Slider aria-label={LABEL} value={40} />);

    expect(container.querySelector('[data-slot="marker"]')).toBeNull();
  });

  it('forwards its ref to the root and takes className there', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <Slider ref={ref} aria-label={LABEL} className="mt-5.5" value={4} />,
    );

    expect(ref.current).toContainElement(screen.getByRole('slider'));
    expect(ref.current).toHaveClass('mt-5.5');
  });
});
