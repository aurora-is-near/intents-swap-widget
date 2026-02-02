import { clsx } from 'clsx';

type Props = {
  value?: string;
  placeholder: string;
  state?: 'normal' | 'error';
  onChange: (value: string) => void;
};

export const TextInput = ({
  value = '',
  state = 'normal',
  placeholder,
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
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          'bg-transparent outline-none flex-1 font-medium text-sm leading-4',
          {
            'text-csw-gray-50 placeholder-csw-gray-300': state === 'normal',
            'text-csw-status-error placeholder-csw-status-error':
              state === 'error',
          },
        )}
      />
    </div>
  </div>
);
