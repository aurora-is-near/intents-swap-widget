import { IMaskInput } from 'react-imask';
import type { ReactNode } from 'react';

type Props = {
  value?: string;
  placeholder: string;
  suffix?: ReactNode;
  onChange: (value: string) => void;
};

export const FeeInput = ({
  value = '',
  placeholder,
  suffix,
  onChange,
}: Props) => (
  <div className="flex-shrink-0">
    <div className="flex gap-csw-md items-center bg-csw-gray-800 px-csw-lg py-csw-md rounded-csw-md">
      <IMaskInput
        lazy={true}
        eager={true}
        unmask={true}
        value={value}
        placeholder={placeholder}
        mask="num%"
        blocks={{
          num: {
            min: 0,
            max: 1,
            scale: 2,
            radix: '.',
            eager: true,
            autofix: true,
            mask: Number,
          },
        }}
        onAccept={(val) => onChange(val)}
        className="bg-transparent text-csw-gray-50 placeholder-csw-gray-300 outline-none flex-1 font-medium text-sm leading-4"
      />

      {!!suffix && (
        <span className="text-csw-label-sm text-csw-gray-300">{suffix}</span>
      )}
    </div>
  </div>
);
