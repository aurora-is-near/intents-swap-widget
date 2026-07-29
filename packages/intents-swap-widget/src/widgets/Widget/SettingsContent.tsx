import { useState } from 'react';
import { motion } from 'framer-motion';
import { IMaskMixin } from 'react-imask';
import type { ComponentPropsWithoutRef, PropsWithChildren } from 'react';
import type { IMaskMixinProps } from 'react-imask';

import { cn } from '@/utils/cn';
import { Card } from '@/components/Card';
import { Toggle } from '@/components/Toggle';
import { Tooltip } from '@/components/Tooltip';
import { useConfig } from '@/config';
import { fireEvent, useUnsafeSnapshot } from '@/machine';
import { useTypedTranslation } from '@/localisation';

import { WidgetConnectWalletButton } from './WidgetConnectWalletButton';

// `maxSlippage` is held in basis points throughout the machine — 100 is 1% — so
// everything entering or leaving this control has to be converted.
const BPS_PER_PERCENT = 100;
const MAX_SLIPPAGE_PERCENT = 50;

const toPercent = (bps: number) => bps / BPS_PER_PERCENT;

const toBasisPoints = (percent: number) =>
  Math.round(percent * BPS_PER_PERCENT);

// Trailing zeros are noise in a field this narrow: 1, 5.5, 0.25 — never 1.00.
const formatPercent = (percent: number) => String(Number(percent.toFixed(2)));

const MaskedPercentInput = IMaskMixin<
  HTMLInputElement,
  IMaskMixinProps<HTMLInputElement> &
    Omit<ComponentPropsWithoutRef<'input'>, 'value' | 'onChange' | 'ref'>
>(({ inputRef, ...props }) => <input ref={inputRef} {...props} />);

// Shared so every setting keeps the same label/tooltip/control rhythm as more
// of them land here.
const SettingRow = ({
  label,
  tooltip,
  children,
}: PropsWithChildren<{ label: string; tooltip: string }>) => (
  <div className="flex items-center justify-between gap-sw-md">
    <div className="flex items-center gap-sw-xxs">
      <span className="text-sw-label-md text-sw-gray-300">{label}</span>
      <Tooltip className="mt-sw-xxs" iconSize={14} text={tooltip} />
    </div>
    {children}
  </div>
);

const SlippageSetting = () => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();
  const { slippageTolerance } = useConfig();

  // Seeded from the machine rather than defaulted, so a remount can never leave
  // the Auto chip disagreeing with the value it is meant to describe.
  const [isAuto, setIsAuto] = useState(
    () => ctx.maxSlippage === slippageTolerance,
  );

  const [value, setValue] = useState(() =>
    ctx.maxSlippage === slippageTolerance
      ? ''
      : formatPercent(toPercent(ctx.maxSlippage)),
  );

  const enableAuto = () => {
    setIsAuto(true);
    setValue('');
    fireEvent('maxSlippageSet', slippageTolerance);
  };

  const onAccept = (next: string) => {
    setValue(next);

    const percent = Number(next);

    // Mid-edit states like '' or '0.' have no slippage worth committing; the
    // machine keeps the last good value until a real one arrives, and `onBlur`
    // guarantees the field never comes to rest empty.
    if (!next || !percent) {
      return;
    }

    setIsAuto(false);
    fireEvent('maxSlippageSet', toBasisPoints(percent));
  };

  const onBlur = () => {
    if (!Number(value)) {
      enableAuto();
    }
  };

  return (
    <SettingRow
      label={t('settings.maxSlippage.label', 'Max slippage')}
      tooltip={t(
        'settings.maxSlippage.tooltip',
        'Your transaction will revert if the price changes more than the slippage percentage. Max value is 50%.',
      )}>
      <div className="flex items-center gap-sw-xs rounded-full border border-sw-gray-800 bg-sw-gray-950 p-sw-xs transition-colors focus-within:border-sw-gray-600">
        <motion.button
          type="button"
          onClick={enableAuto}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 600, damping: 30 }}
          className={cn(
            'cursor-pointer rounded-full px-sw-xl py-sw-md text-sw-label-md transition-colors',
            isAuto
              ? 'bg-sw-accent-500 text-sw-gray-950'
              : 'bg-sw-gray-800 text-sw-gray-200 hover:text-sw-gray-100 hover:bg-sw-gray-700',
          )}>
          {t('settings.maxSlippage.auto.label', 'Auto')}
        </motion.button>

        {/* The `%` is a static suffix rather than part of the value, so the
            placeholder only has to carry the number and the two read as one. */}
        <div className="flex items-center pr-sw-md text-sw-label-md">
          <MaskedPercentInput
            mask={Number}
            scale={2}
            radix="."
            mapToRadix={[',']}
            min={0}
            max={MAX_SLIPPAGE_PERCENT}
            autofix
            unmask
            inputMode="decimal"
            value={value}
            onAccept={onAccept}
            onBlur={onBlur}
            placeholder={formatPercent(toPercent(slippageTolerance))}
            aria-label={t('settings.maxSlippage.label', 'Max slippage')}
            className="w-[34px] bg-transparent text-right text-sw-gray-50 outline-none placeholder:text-sw-gray-500"
          />
          {/* Dimmed alongside the placeholder so an empty field reads as one
              greyed-out `1%` rather than a bright `%` stuck to a faint `1`. */}
          <span
            className={cn(
              'transition-colors',
              value ? 'text-sw-gray-50' : 'text-sw-gray-500',
            )}>
            {' %'}
          </span>
        </div>
      </div>
    </SettingRow>
  );
};

const ConfidentialSetting = () => {
  const { t } = useTypedTranslation();
  const { ctx } = useUnsafeSnapshot();

  return (
    <SettingRow
      label={t('settings.confidential.label', 'Confidential')}
      tooltip={t(
        'settings.confidential.tooltip',
        'Every cross-chain swap normally leaves a trail. Confidential swaps hide it.',
      )}>
      <Toggle
        isOn={ctx.confidentialMode === 'confidential'}
        onToggle={(value) =>
          fireEvent('confidentialModeSet', value ? 'confidential' : 'public')
        }
      />
    </SettingRow>
  );
};

type Props = {
  onClose: () => void;
};

export const SettingsContent = ({ onClose }: Props) => {
  const { confidentialMode } = useConfig();

  return (
    <Card className="flex w-full flex-col gap-sw-2xl">
      <div className="flex flex-col gap-sw-lg w-full">
        <SlippageSetting />
        {confidentialMode === 'user-choice' && <ConfidentialSetting />}
      </div>
      <WidgetConnectWalletButton onClose={onClose} />
    </Card>
  );
};
