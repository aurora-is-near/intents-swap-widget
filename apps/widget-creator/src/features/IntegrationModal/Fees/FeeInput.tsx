import { clsx } from 'clsx';
import { IMaskInput } from 'react-imask';
import type { ReactNode } from 'react';

type Props = {
  value?: string;
  placeholder: string;
  suffix?: ReactNode;
  state?: 'normal' | 'error';
  onChange: (value: string) => void;
};

export const FeeInput = ({
  value = '',
  placeholder,
  suffix,
  state = 'normal',
  onChange,
}: Props) => (
  <div className="flex-shrink-0">
    <div
      className={clsx(
        'flex gap-csw-md items-center px-csw-lg py-csw-md rounded-csw-md',
        {
          'bg-csw-gray-800': state === 'normal',
          'bg-csw-status-error/20': state === 'error',
        },
      )}>
      <IMaskInput
        lazy={true}
        eager={true}
        unmask={false}
        value={value}
        placeholder={placeholder}
        mask="num%"
        blocks={{
          num: {
            mask: Number,
            scale: 2, // max 2 decimal places
            min: 0, // minimum value
            max: 1, // maximum value (1.00)
            radix: '.', // decimal separator
            mapToRadix: ['.'], // map dot key to radix
            padFractionalZeros: false, // don't force trailing zeros
            normalizeZeros: true, // normalize leading zeros
          },
        }}
        onAccept={(val) => onChange(val)}
        className={clsx(
          'bg-transparent outline-none flex-1 font-medium text-sm leading-4',
          {
            'text-csw-gray-50 placeholder-csw-gray-300': state === 'normal',
            'text-csw-status-error placeholder-csw-status-error':
              state === 'error',
          },
        )}
      />

      {!!suffix && (
        <span
          className={clsx('text-csw-label-sm', {
            'text-csw-status-error': state === 'error',
            'text-csw-gray-300': state === 'normal',
          })}>
          {suffix}
        </span>
      )}
    </div>
  </div>
);
