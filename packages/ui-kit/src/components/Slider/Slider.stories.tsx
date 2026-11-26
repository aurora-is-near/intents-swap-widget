import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { RISK_ZONE_COLORS, Slider } from './Slider';
import type { SliderZone } from './Slider';

/** The artboard's LTV zones end at 50, 65, 80 and 90 (line 304). */
const LTV_MAX = 90;
const LTV_ZONES: readonly SliderZone[] = [50, 65, 80, 90].map(
  (upTo, index) => ({
    upTo,
    color: RISK_ZONE_COLORS[index] ?? RISK_ZONE_COLORS[0],
  }),
);

const LIQ_LTV = 83;

const meta = {
  title: 'Components/Slider',
  component: Slider,
  args: {
    'aria-label': 'Percent',
    defaultValue: 40,
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
  },
  argTypes: {
    defaultValue: { control: { type: 'number' } },
    min: { control: { type: 'number' } },
    max: { control: { type: 'number' } },
    step: { control: { type: 'number' } },
    disabled: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div className="max-w-115 pt-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Slider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** The four loan-to-value risk zones, safe to risky, from `RISK_ZONE_COLORS`. */
export const RiskZones: Story = {
  args: {
    'aria-label': 'Loan to value, percent',
    max: LTV_MAX,
    zones: LTV_ZONES,
  },
};

/** A fixed mark on the track, such as the liquidation threshold. */
export const WithMarker: Story = {
  args: {
    'aria-label': 'Loan to value, percent',
    max: LTV_MAX,
    zones: LTV_ZONES,
    marker: { value: LIQ_LTV, label: `liq. ${LIQ_LTV}%` },
  },
};

export const Disabled: Story = {
  args: { 'aria-label': 'Disabled slider', defaultValue: 30, disabled: true },
};

function SliderHeading({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-14 font-semibold text-mut">{label}</span>
      <span className="text-28 font-extrabold tracking-figure">{value}%</span>
    </div>
  );
}

function LtvSlider() {
  const [ltv, setLtv] = useState(40);

  return (
    <div>
      <SliderHeading label="Loan to value" value={ltv} />
      <Slider
        aria-label="Loan to value, percent"
        className="mt-5.5"
        getAriaValueText={(_formatted, value) => `${value} percent`}
        marker={{ value: LIQ_LTV, label: `liq. ${LIQ_LTV}%` }}
        max={LTV_MAX}
        onValueChange={setLtv}
        value={ltv}
        zones={LTV_ZONES}
      />
    </div>
  );
}

function RepaySlider() {
  const [repay, setRepay] = useState(50);

  return (
    <div>
      <SliderHeading label="Amount to repay" value={repay} />
      <Slider
        aria-label="Percent of debt to repay"
        onValueChange={setRepay}
        value={repay}
      />
    </div>
  );
}

/**
 * The loan-to-value slider: risk zones, the liquidation marker and the
 * value read out as a percentage.
 */
export const LoanToValue: Story = {
  render: () => <LtvSlider />,
};

/** The plain repay slider. */
export const Repay: Story = {
  render: () => <RepaySlider />,
};

/** Every slider the Borrow app uses. */
export const AllSliders: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <LtvSlider />
      <RepaySlider />
      <Slider aria-label="Disabled slider" defaultValue={30} disabled />
    </div>
  ),
};
