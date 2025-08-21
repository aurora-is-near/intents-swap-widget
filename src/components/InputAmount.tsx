import { forwardRef } from 'react';
import { IMaskMixin } from 'react-imask';
import type { InputElement } from 'imask';
import type { IMaskMixinProps } from 'react-imask';

import { Input as UIInput } from '@headlessui/react';

import { cn } from '@/utils/cn';
import type { Props as InputProps } from './Input';

const RawInputAmount = forwardRef<
  InputElement,
  InputProps & { rawValue: string }
>(({ state, className, rawValue, onFocus, ...inputProps }, ref) => {
  return (
    <UIInput
      ref={ref}
      type="text"
      autoComplete="off"
      data-lpignore="true"
      disabled={state === 'disabled'}
      className={cn(
        'font-suisse h-[48px] w-full font-medium text-gray-50 data-focus:outline-none',
        { 'text-gray-200': state === 'disabled' },
        { 'text-alert-100': state === 'error' },
        className,
      )}
      style={{
        fontSize: rawValue && rawValue.length > 15 ? '24px' : '32px',
      }}
      // hack to not show password manager icons in some cases
      readOnly
      onFocus={(e) => {
        e.target.removeAttribute('readOnly');
        onFocus?.(e);
      }}
      {...inputProps}
    />
  );
});

RawInputAmount.displayName = 'RawInputAmount';

export const MaskedInputAmount = IMaskMixin<
  InputElement,
  IMaskMixinProps<InputElement> &
    Omit<InputProps, 'children' | 'className'> & { rawValue: string }
>(({ inputRef, ...props }) => {
  return <RawInputAmount ref={inputRef} {...props} />;
});

export const InputAmount = ({
  value,
  setValue,
  ...props
}: Omit<InputProps, 'value'> & {
  value: string;
  setValue: (v: string) => void;
}) => {
  return (
    // @ts-expect-error Use Number instead of MaskedNumber
    <MaskedInputAmount
      scale={18}
      value={value}
      rawValue={value}
      mask={Number}
      onAccept={setValue}
      padFractionalZeros={false}
      normalizeZeros
      thousandsSeparator=""
      mapToRadix={[',']}
      radix="."
      autofix
      unmask
      {...props}
    />
  );
};
